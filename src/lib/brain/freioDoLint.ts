


export const INTERVALO_LINT_ACERVO_MS = 24 * 60 * 60_000

export function deveMedirLintAcervo(
  ultimaMedicaoIso: string | null | undefined,
  agoraMs: number,
  intervaloMs: number = INTERVALO_LINT_ACERVO_MS,
): boolean {
  const t = Date.parse((ultimaMedicaoIso ?? '').trim())
  if (!Number.isFinite(t)) return true
  if (t > agoraMs) return true
  return agoraMs - t >= intervaloMs
}
