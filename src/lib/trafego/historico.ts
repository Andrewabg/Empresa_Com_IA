
const DAY = 86400000
export const BACKFILL_TARGET = 90
export const BACKFILL_STEP = 30
export const BACKFILL_INICIAL = 30

function shift(iso: string, d: number): string {
  const t = new Date(iso + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + d); return t.toISOString().slice(0, 10)
}
function diffDias(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY)
}


export function janelaBackfill(earliestStored: string | null, hojeISO: string): { since: string; until: string } {
  const profundidadeAtual = earliestStored ? diffDias(earliestStored, hojeISO) : 0
  const alvo = Math.min(BACKFILL_TARGET, Math.max(BACKFILL_INICIAL, profundidadeAtual + BACKFILL_STEP))
  return { since: shift(hojeISO, -alvo), until: hojeISO }
}


export function diasFaltantes(sinceISO: string, untilISO: string, gravados: string[], hojeISO: string): string[] {
  const set = new Set(gravados)
  const out: string[] = []
  for (let d = sinceISO; d <= untilISO; d = shift(d, 1)) {
    if (!set.has(d) || d === hojeISO) out.push(d)
  }
  if (untilISO < hojeISO && !out.includes(hojeISO)) out.push(hojeISO) 
  return [...new Set(out)].sort()
}
