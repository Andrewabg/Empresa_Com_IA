


export const LIMITE_RESULTADO = 4000


export function resumirResultado(resultado: unknown): string {
  if (resultado === undefined || resultado === null) return ''
  let texto: string
  try {
    texto = typeof resultado === 'string' ? resultado : JSON.stringify(resultado, null, 2)
  } catch {
    return '' 
  }
  if (typeof texto !== 'string') return ''
  return texto.length > LIMITE_RESULTADO
    ? texto.slice(0, LIMITE_RESULTADO) + `\n… (resultado cortado em ${LIMITE_RESULTADO} caracteres)`
    : texto
}


export function textoDoResultado(
  approval: { title?: string | null; action_slug?: string | null },
  resultado: unknown,
): string {
  const rotulo = approval.title?.trim() || approval.action_slug?.trim() || 'ação externa'
  const corpo = resumirResultado(resultado)
  const cabecalho = `✅ Você aprovou "${rotulo}" e eu executei. Resultado abaixo — use este dado, não peça de novo.`
  return corpo ? `${cabecalho}\n\n\`\`\`json\n${corpo}\n\`\`\`` : `${cabecalho}\n\n(A ação não devolveu conteúdo.)`
}


export const LIMITE_ERRO = 800


export function resultadoFalhou(resultado: unknown): boolean {
  if (!resultado || typeof resultado !== 'object') return false
  return (resultado as { successful?: unknown }).successful === false
}


export function erroDoResultado(resultado: unknown): string {
  if (!resultado || typeof resultado !== 'object') return ''
  const r = resultado as { error?: unknown; data?: { message?: unknown } }
  if (typeof r.error === 'string' && r.error.trim()) return r.error
  if (typeof r.data?.message === 'string' && r.data.message.trim()) return r.data.message
  return ''
}


export const CABECALHO_FALHA =
  'O motivo real está abaixo, como a ferramenta o devolveu. Leia o erro e conserte o que ele aponta antes de tentar outra vez: repropor a mesma chamada sem corrigir dá exatamente o mesmo resultado. Não diga que a ferramenta é incapaz de fazer isso nem invente um limite do sistema; o que houve foi este erro.'


function resumirErro(erro: unknown): string {
  const bruto = erro instanceof Error ? erro.message : typeof erro === 'string' ? erro : safeJson(erro)
  const limpo = (bruto ?? '').replace(/\s+/g, ' ').trim()
  if (!limpo) return ''
  return limpo.length > LIMITE_ERRO ? `${limpo.slice(0, LIMITE_ERRO)}…` : limpo
}

function safeJson(v: unknown): string {
  try { return JSON.stringify(v) ?? '' } catch { return '' }
}


export function textoDaFalha(
  approval: { title?: string | null; action_slug?: string | null },
  erro: unknown,
): string {
  const rotulo = approval.title?.trim() || approval.action_slug?.trim() || 'ação externa'
  const detalhe = resumirErro(erro)
  const cabecalho = `⚠️ Você aprovou "${rotulo}" e a execução falhou. ${CABECALHO_FALHA}`
  return detalhe ? `${cabecalho}\n\n\`\`\`\n${detalhe}\n\`\`\`` : `${cabecalho}\n\n(A ferramenta não devolveu detalhe do erro.)`
}
