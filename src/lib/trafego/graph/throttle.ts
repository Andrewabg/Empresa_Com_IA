



export const THROTTLE_SETTING_KEY = 'trafego_throttled_until'
export const CODIGOS_DE_THROTTLE: ReadonlySet<number> = new Set([17, 4, 32, 613, 80000, 80004])
export const JANELA_PADRAO_DE_THROTTLE_MIN = 60

export const TETO_DA_PAUSA_MIN = 1440

export interface SinalDeThrottle { throttle: true; minutos: number; estimado: boolean }

function minutosDoHeader(headers: Record<string, string>): number {
  const bruto = headers['x-business-use-case-usage']
  if (!bruto) return 0
  let json: unknown
  try { json = JSON.parse(bruto) } catch { return 0 }
  if (!json || typeof json !== 'object') return 0
  let max = 0
  for (const entradas of Object.values(json as Record<string, unknown>)) {
    if (!Array.isArray(entradas)) continue
    for (const e of entradas) {
      const n = Number((e as { estimated_time_to_regain_access?: unknown })?.estimated_time_to_regain_access)
      if (Number.isFinite(n) && n > max) max = n
    }
  }
  return max
}

export function ehThrottle(erro: { code?: number } | null, headers: Record<string, string>): SinalDeThrottle | { throttle: false } {
  const estimado = minutosDoHeader(headers)
  if (estimado > 0) return { throttle: true, minutos: Math.min(Math.ceil(estimado), TETO_DA_PAUSA_MIN), estimado: true }
  if (erro && typeof erro.code === 'number' && CODIGOS_DE_THROTTLE.has(erro.code)) return { throttle: true, minutos: JANELA_PADRAO_DE_THROTTLE_MIN, estimado: false }
  return { throttle: false }
}

export function throttleAtivo(valorDoSetting: string | null | undefined, agoraISO: string): { ativo: boolean; minutosRestantes: number } {
  if (!valorDoSetting) return { ativo: false, minutosRestantes: 0 }
  const ate = Date.parse(valorDoSetting)
  const agora = Date.parse(agoraISO)
  if (!Number.isFinite(ate) || !Number.isFinite(agora) || ate <= agora) return { ativo: false, minutosRestantes: 0 }
  if (ate - agora > TETO_DA_PAUSA_MIN * 60_000) return { ativo: false, minutosRestantes: 0 }
  return { ativo: true, minutosRestantes: Math.ceil((ate - agora) / 60_000) }
}

export function ateQuando(agoraISO: string, minutos: number): string {
  return new Date(Date.parse(agoraISO) + Math.min(minutos, TETO_DA_PAUSA_MIN) * 60_000).toISOString()
}
