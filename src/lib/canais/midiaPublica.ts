





export const CAP_SLUG = 60


export function normalizarSlug(rotulo: string): string {
  const semAcento = (rotulo ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  const bruto = semAcento
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  
  return bruto.slice(0, CAP_SLUG).replace(/-$/, '')
}


export function resolverSlug(slugs: string[], pedido: string): string | null {
  const alvo = (pedido ?? '').trim()
  if (!alvo) return null
  const exato = slugs.find((s) => s === alvo)
  if (exato) return exato
  const baixo = alvo.toLowerCase()
  return slugs.find((s) => s.toLowerCase() === baixo) ?? null
}
