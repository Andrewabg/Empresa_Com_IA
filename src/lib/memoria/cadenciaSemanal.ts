






export const SEMANA_MS = 7 * 24 * 60 * 60_000


export function venceuASemana(ultimoIso: string | null | undefined, agoraMs: number, janelaMs = SEMANA_MS): boolean {
  const t = Date.parse((ultimoIso ?? '').trim())
  if (!Number.isFinite(t)) return true
  if (t > agoraMs) return true
  return agoraMs - t >= janelaMs
}
