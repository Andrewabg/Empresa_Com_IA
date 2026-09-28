





export interface PublicoEstimado {
  minimo: number
  maximo: number
  
  pronto: boolean
}


export const LIMITE_PUBLICO_ESTREITO = 5_000

const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined


export function parsePublicoEstimado(envelope: unknown): PublicoEstimado | null {
  if (!envelope || typeof envelope !== 'object') return null
  const data = (envelope as { data?: unknown }).data
  if (!Array.isArray(data) || data.length === 0) return null
  const row = data[0]
  if (!row || typeof row !== 'object') return null
  const r = row as Record<string, unknown>
  const minimo = num(r.estimate_mau_lower_bound)
  const maximo = num(r.estimate_mau_upper_bound)
  if (minimo === undefined || maximo === undefined) return null
  return { minimo, maximo, pronto: r.estimate_ready === true }
}


export function publicoEstreito(p: PublicoEstimado | null): boolean {
  if (!p || !p.pronto) return false
  return p.maximo < LIMITE_PUBLICO_ESTREITO
}
