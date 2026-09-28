









const CHAVES_TECNICAS = new Set(['quantidades', 'entrega'])


function valorLegivel(v: unknown): string {
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return v.map(valorLegivel).filter(Boolean).join(', ')
  return ''
}


export function renderBriefParaPrompt(
  brief: Record<string, unknown> | undefined | null,
  separador = '\n',
): string {
  return Object.entries(brief ?? {})
    .filter(([k]) => !CHAVES_TECNICAS.has(k))
    .map(([k, v]) => [k, valorLegivel(v)] as const)
    .filter(([, v]) => !!v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(separador)
}
