
export function pseudoAmplitude(tSeconds: number, seed = 0): number {
  const t = tSeconds
  
  const phrase = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 0.6 + seed * 1.3)
  
  const syllable = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 3.1 + seed * 0.7)
  
  const texture = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 7.7 + seed * 2.1)

  
  let amp = phrase * (0.55 + 0.30 * syllable + 0.15 * texture)

  
  
  const gate = phrase < 0.18 ? phrase / 0.18 : 1
  amp *= gate

  return clamp01(amp)
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}
