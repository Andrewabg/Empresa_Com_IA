















import { classificarFalhaDoModelo } from '@/lib/modelo/falhaDoModelo'

export type MotivoFalhaImagem =
  | 'seguranca'
  | 'organizacao_nao_verificada'
  | 'sem_credito'
  | 'chave_invalida'
  | 'limite'
  | 'sem_acesso'


function textoDoErro(erro: unknown): string {
  const partes: string[] = []
  const visitar = (v: unknown, profundidade: number): void => {
    if (profundidade > 6 || v == null) return
    if (typeof v === 'string') { partes.push(v); return }
    if (typeof v === 'number') { partes.push(String(v)); return }
    if (typeof v !== 'object') return
    for (const chave of ['message', 'code', 'type', 'responseBody', 'statusCode', 'status', 'error', 'data', 'cause']) {
      const filho = (v as Record<string, unknown>)[chave]
      if (filho !== undefined) visitar(filho, profundidade + 1)
    }
  }
  visitar(erro, 0)
  if (erro instanceof Error && erro.message) partes.push(erro.message)
  return partes.join(' | ').toLowerCase()
}


export function classificarFalhaDaImagem(erro: unknown): MotivoFalhaImagem | null {
  const t = textoDoErro(erro)
  if (!t) return null
  if (/safety|moderation|content policy/.test(t)) return 'seguranca'
  if (t.includes('must be verified') || t.includes('organization_verification')) {
    return 'organizacao_nao_verificada'
  }
  return classificarFalhaDoModelo(erro)
}


export function textoDaFalhaDaImagem(motivo: MotivoFalhaImagem | null, oQueFalhou: string): string {
  if (motivo === 'seguranca') {
    return 'A OpenAI recusou esse pedido por política de conteúdo, o que é comum com fotos de pessoas. Me diz outro enquadramento e eu refaço.'
  }
  if (motivo === 'organizacao_nao_verificada') {
    return `A sua organização na OpenAI ainda não está verificada, e sem isso ela não libera o modelo de imagem. Por isso o texto funciona e ${oQueFalhou} não. Faça a verificação da organização no painel da OpenAI e eu gero na hora.`
  }
  if (motivo === 'sem_credito') {
    return `Os créditos da sua conta da OpenAI acabaram, então não consigo gerar ${oQueFalhou}. Coloque crédito na conta e eu retomo daqui.`
  }
  if (motivo === 'chave_invalida') {
    return `A chave da OpenAI foi recusada, então não consigo gerar ${oQueFalhou}. Salve a chave nas Configurações e eu retomo daqui.`
  }
  if (motivo === 'sem_acesso') {
    return `A sua conta da OpenAI não tem acesso ao modelo de imagem, então não consigo gerar ${oQueFalhou}. Confira o plano da sua conta na OpenAI.`
  }
  if (motivo === 'limite') {
    return `A OpenAI está limitando as chamadas da sua conta agora, então não consegui gerar ${oQueFalhou}. Costuma passar sozinho em instantes.`
  }
  return `Não consegui gerar ${oQueFalhou} agora. Nada foi feito, então dá para me pedir de novo em instantes.`
}


export function motivoDominante(motivos: ReadonlyArray<MotivoFalhaImagem | null>): MotivoFalhaImagem | null {
  for (const m of motivos) if (m) return m
  return null
}


export function avisoDeFalhaParcial(motivo: MotivoFalhaImagem | null): string {
  if (!motivo) return ''
  if (motivo === 'seguranca') {
    return ' As que faltaram foram recusadas por política de conteúdo, o que é comum com fotos de pessoas.'
  }
  if (motivo === 'organizacao_nao_verificada') {
    return ' As que faltaram esbarraram na verificação da organização na OpenAI, que ainda não está feita.'
  }
  if (motivo === 'sem_credito') return ' As que faltaram esbarraram nos créditos da sua conta da OpenAI, que acabaram.'
  if (motivo === 'chave_invalida') return ' As que faltaram esbarraram na chave da OpenAI, que foi recusada.'
  if (motivo === 'sem_acesso') return ' As que faltaram esbarraram no acesso da sua conta da OpenAI ao modelo de imagem.'
  return ' As que faltaram esbarraram no limite de chamadas da sua conta da OpenAI, que costuma liberar sozinho.'
}
