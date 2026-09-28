


export const TETO_DO_TITULO = 80


const SUBSTANTIVO: Record<string, string> = {
  tool_action: 'Ação',
  custom_tool: 'Tool custom',
  plan: 'Plano',
  directive: 'Regra',
  brain_pr: 'Proposta sensível',
}


export function idDoEventoDeCriacao(approvalId: string): string {
  return `apr:${approvalId}:criada`
}


function encurtar(t: string): string {
  if (t.length <= TETO_DO_TITULO) return t
  return `${t.slice(0, TETO_DO_TITULO).trimEnd()}…`
}


export function rotuloDaCriacao(kind: string, title?: string | null): string {
  const substantivo = SUBSTANTIVO[kind] ?? 'Proposta'
  const t = (title ?? '').trim()
  if (!t) return `${substantivo} aguarda aprovação`
  const semPrefixo = t.replace(new RegExp(`^${substantivo}\\s*:\\s*`, 'i'), '').trim()
  if (!semPrefixo) return `${substantivo} aguarda aprovação`
  return `${substantivo} aguarda aprovação: ${encurtar(semPrefixo)}`
}
