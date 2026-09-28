





export const TYPING_TTL_MS = 25_000

export const TYPING_RENOVAR_MS = 20_000

export const TYPING_MAX_RENOVACOES = 12

export function deveRenovarTyping(input: {
  
  ultimoEnvioMs: number | null
  agoraMs: number
  renovacoes: number
}): boolean {
  const { ultimoEnvioMs, agoraMs, renovacoes } = input
  if (renovacoes >= TYPING_MAX_RENOVACOES) return false
  if (ultimoEnvioMs === null) return true
  return agoraMs - ultimoEnvioMs >= TYPING_RENOVAR_MS
}
