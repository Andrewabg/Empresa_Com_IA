


export function getAudioContextCtor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  )
}


export function rmsFromBytes(bytes: Uint8Array | number[]): number {
  const n = bytes.length
  if (n === 0) return 0
  let sumSq = 0
  for (let i = 0; i < n; i++) {
    const v = (bytes[i] - 128) / 128 
    sumSq += v * v
  }
  const rms = Math.sqrt(sumSq / n)
  return clamp01(rms)
}


export function normalizeLevel(rms: number, gain = 3.2, noiseFloor = 0.015): number {
  if (Number.isNaN(rms)) return 0
  const gated = Math.max(0, rms - noiseFloor)
  return clamp01(gated * gain)
}


export function smoothLevel(current: number, target: number, factor = 0.3): number {
  if (Number.isNaN(current)) current = 0
  if (Number.isNaN(target)) target = 0
  const f = clamp01(factor)
  return current + (target - current) * f
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}
