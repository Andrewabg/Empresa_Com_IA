





export interface ArcPos {
  
  xPct: number
  
  yPct: number
  
  scale: number
  
  opacity: number
}


const X_MIN = 0.09
const X_MAX = 0.91


const Y_TOP = 0.14
const Y_DROP = 0.19

const SCALE_FALLOFF = 0.2
const OPACITY_CENTER = 0.9
const OPACITY_FALLOFF = 0.34


export function arcPositions(count: number): ArcPos[] {
  if (count <= 0) return []
  if (count === 1) return [{ xPct: 0.5, yPct: Y_TOP, scale: 1, opacity: OPACITY_CENTER }]
  const out: ArcPos[] = []
  for (let i = 0; i < count; i++) {
    const f = i / (count - 1) 
    const t = f * 2 - 1 
    const tt = t * t
    out.push({
      xPct: X_MIN + (X_MAX - X_MIN) * f,
      yPct: Y_TOP + Y_DROP * tt,
      scale: 1 - SCALE_FALLOFF * Math.abs(t),
      opacity: OPACITY_CENTER - OPACITY_FALLOFF * Math.abs(t),
    })
  }
  return out
}
