











export type MotivoFalhaModelo = 'sem_credito' | 'chave_invalida' | 'limite' | 'sem_acesso'


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


export function classificarFalhaDoModelo(erro: unknown): MotivoFalhaModelo | null {
  const t = textoDoErro(erro)
  if (!t) return null
  if (t.includes('insufficient_quota') || t.includes('exceeded your current quota') || t.includes('billing_hard_limit')) {
    return 'sem_credito'
  }
  if (t.includes('invalid_api_key') || t.includes('incorrect api key') || t.includes('invalid authentication')) {
    return 'chave_invalida'
  }
  if (t.includes('account_deactivated') || t.includes('model_not_found') || t.includes('does not have access to model')) {
    return 'sem_acesso'
  }
  if (t.includes('rate_limit_exceeded') || t.includes('rate limit')) return 'limite'
  return null
}


export interface ContextoDaFalhaDoModelo {
  
  paradoDeVez: string
  
  paradoEmParte: string
  
  retomada: string
}


export const CONTEXTO_DAS_CONVERSAS: ContextoDaFalhaDoModelo = {
  paradoDeVez: 'nenhum agente consegue responder',
  paradoEmParte: 'algumas respostas não estão saindo',
  retomada: 'o atendimento volta sozinho, inclusive nas conversas que ficaram esperando',
}


export const CONTEXTO_DAS_FONTES: ContextoDaFalhaDoModelo = {
  paradoDeVez: 'eu não consigo montar as perguntas do seu banco nem escrever as notas delas',
  paradoEmParte: 'algumas leituras agendadas do seu banco não estão acontecendo',
  retomada: 'a leitura agendada do seu banco volta a rodar sozinha',
}


export function textoDaFalhaDoModelo(
  motivo: MotivoFalhaModelo, ctx: ContextoDaFalhaDoModelo = CONTEXTO_DAS_CONVERSAS,
): string {
  if (motivo === 'sem_credito') {
    return `Os créditos da sua conta da OpenAI acabaram, então ${ctx.paradoDeVez}. Coloque crédito na conta e ${ctx.retomada}.`
  }
  if (motivo === 'chave_invalida') {
    return `A chave da OpenAI foi recusada, então ${ctx.paradoDeVez}. Salvar a chave de novo nas Configurações resolve, e ${ctx.retomada}.`
  }
  if (motivo === 'sem_acesso') {
    return `A sua conta da OpenAI não tem acesso ao modelo escolhido, então ${ctx.paradoDeVez}. Confira o modelo do agente ou o plano da sua conta na OpenAI.`
  }
  return `A OpenAI está limitando a quantidade de chamadas da sua conta, então ${ctx.paradoEmParte}. Costuma passar sozinho; se insistir, confira os limites da sua conta na OpenAI.`
}

function copyPorContexto(ctx: ContextoDaFalhaDoModelo): Record<MotivoFalhaModelo, string> {
  return {
    sem_credito: textoDaFalhaDoModelo('sem_credito', ctx),
    chave_invalida: textoDaFalhaDoModelo('chave_invalida', ctx),
    sem_acesso: textoDaFalhaDoModelo('sem_acesso', ctx),
    limite: textoDaFalhaDoModelo('limite', ctx),
  }
}


export const COPY_FALHA_MODELO: Record<MotivoFalhaModelo, string> = copyPorContexto(CONTEXTO_DAS_CONVERSAS)


export const COPY_FALHA_MODELO_FONTES: Record<MotivoFalhaModelo, string> = copyPorContexto(CONTEXTO_DAS_FONTES)


export interface AlertaDoModelo {
  motivo: MotivoFalhaModelo
  
  em: string
}


export const VALIDADE_ALERTA_MS = 24 * 60 * 60 * 1000

const MOTIVOS: readonly MotivoFalhaModelo[] = ['sem_credito', 'chave_invalida', 'limite', 'sem_acesso']


export function lerAlertaDoModelo(cru: unknown, agoraIso: string, validadeMs = VALIDADE_ALERTA_MS): AlertaDoModelo | null {
  let obj: unknown = cru
  if (typeof cru === 'string') {
    if (!cru.trim()) return null
    try { obj = JSON.parse(cru) } catch { return null }
  }
  if (!obj || typeof obj !== 'object') return null
  const a = obj as { motivo?: unknown; em?: unknown }
  if (!MOTIVOS.includes(a.motivo as MotivoFalhaModelo)) return null
  if (typeof a.em !== 'string') return null
  const em = Date.parse(a.em)
  const agora = Date.parse(agoraIso)
  if (!Number.isFinite(em) || !Number.isFinite(agora)) return null
  
  
  if (agora - em > validadeMs) return null
  return { motivo: a.motivo as MotivoFalhaModelo, em: a.em }
}


export const COPY_TESTE_CHAVE: Record<MotivoFalhaModelo, string> = {
  sem_credito: 'a chave é válida, mas a conta da OpenAI está sem créditos',
  chave_invalida: 'a chave foi recusada pela OpenAI',
  sem_acesso: 'a chave é válida, mas a conta não tem acesso ao modelo',
  limite: 'a chave é válida, mas a OpenAI está limitando as chamadas da conta agora',
}
