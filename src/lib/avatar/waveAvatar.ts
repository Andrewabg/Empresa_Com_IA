

export interface WaveAvatarComponent {
  
  freq: number
  
  phase: number
  
  amp: number
  
  drift: number
}

export interface WaveAvatarParams {
  components: [WaveAvatarComponent, WaveAvatarComponent, WaveAvatarComponent]
}


function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}


function unit(seed: string): number {
  return fnv1a(seed) / 0x1_0000_0000
}


const FREQ_RANGES = [
  [2, 3.5],
  [4.5, 7],
  [9, 13],
] as const
const AMP_RANGES = [
  [0.5, 1],
  [0.25, 0.6],
  [0.1, 0.35],
] as const
const DRIFT_RANGES = [
  [0.4, 0.7],
  [0.6, 1.0],
  [0.9, 1.4],
] as const

function lerp(range: readonly [number, number], u: number): number {
  return range[0] + (range[1] - range[0]) * u
}


export function waveAvatarParams(agentId: string): WaveAvatarParams {
  const raw = [0, 1, 2].map((i) => ({
    freq: lerp(FREQ_RANGES[i], unit(`${agentId}#f${i}`)),
    phase: unit(`${agentId}#p${i}`) * Math.PI * 2,
    amp: lerp(AMP_RANGES[i], unit(`${agentId}#a${i}`)),
    drift: lerp(DRIFT_RANGES[i], unit(`${agentId}#d${i}`)),
  }))
  const total = raw[0].amp + raw[1].amp + raw[2].amp
  const components = raw.map((c) => ({ ...c, amp: c.amp / total })) as WaveAvatarParams['components']
  return { components }
}

export interface WaveAvatarPathOpts {
  width: number
  height: number
  
  points: number
  
  t: number
  
  amplitude?: number
}


export function waveAvatarPath(params: WaveAvatarParams, opts: WaveAvatarPathOpts): string {
  
  if (opts.points < 1) return ''
  const { width, height, points, t } = opts
  const ampFactor = opts.amplitude ?? 1
  const mid = height / 2
  const span = height * 0.32 * ampFactor
  const parts: string[] = []
  for (let i = 0; i <= points; i++) {
    const x01 = i / points
    let y = 0
    for (const c of params.components) {
      y += c.amp * Math.sin(x01 * Math.PI * c.freq + c.phase + t * c.drift)
    }
    const edge = Math.sin(x01 * Math.PI)
    const px = (x01 * width).toFixed(2)
    const py = (mid - y * edge * span).toFixed(2)
    parts.push(`${i === 0 ? 'M' : 'L'}${px} ${py}`)
  }
  return parts.join(' ')
}
