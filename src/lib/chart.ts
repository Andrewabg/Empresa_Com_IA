


export const CHART_SCHEMA_REVISION = '2938:1518:67d8:b3be:14d8:5851:8bba:fb4e' as const


export function scaleLinear(
  value: number,
  [d0, d1]: readonly [number, number],
  [r0, r1]: readonly [number, number],
): number {
  
  if (d1 === d0) return (r0 + r1) / 2
  const t = (value - d0) / (d1 - d0)
  return r0 + t * (r1 - r0)
}


export function clamp(n: number, min: number, max: number): number {
  return n < min ? min : n > max ? max : n
}


export interface Pt {
  x: number
  y: number
}


export function seriesToPoints(values: number[], w: number, h: number, max: number): Pt[] {
  const n = values.length
  if (n === 0) return []
  const safeMax = max > 0 ? max : 1 

  return values.map((v, i) => {
    const x = n === 1 ? w / 2 : (i / (n - 1)) * w
    
    const y = h - clamp(v / safeMax, 0, 1) * h
    return { x, y }
  })
}


function r2(n: number): number {
  return Math.round(n * 100) / 100
}


export function buildLinePath(values: number[], w: number, h: number, max: number): string {
  const pts = seriesToPoints(values, w, h, max)
  if (pts.length === 0) return ''
  if (pts.length === 1) {
    const { x, y } = pts[0]
    return `M ${r2(x - 0.01)} ${r2(y)} L ${r2(x + 0.01)} ${r2(y)}`
  }
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${r2(p.x)} ${r2(p.y)}`)
    .join(' ')
}


export function buildAreaPath(values: number[], w: number, h: number, max: number): string {
  const pts = seriesToPoints(values, w, h, max)
  if (pts.length === 0) return ''
  const first = pts[0]
  const last = pts[pts.length - 1]
  const line =
    pts.length === 1
      ? `M ${r2(first.x - 0.01)} ${r2(first.y)} L ${r2(first.x + 0.01)} ${r2(first.y)}`
      : pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${r2(p.x)} ${r2(p.y)}`).join(' ')
  const lx = pts.length === 1 ? first.x + 0.01 : last.x
  const fx = pts.length === 1 ? first.x - 0.01 : first.x
  return `${line} L ${r2(lx)} ${r2(h)} L ${r2(fx)} ${r2(h)} Z`
}


export function niceTicks(max: number, count = 4): number[] {
  if (!(max > 0)) return [0]
  const c = Math.max(1, Math.floor(count))
  const rawStep = max / c
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const norm = rawStep / mag 
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  const step = niceNorm * mag

  const ticks: number[] = []
  
  const top = Math.ceil(max / step) * step
  
  
  
  
  
  const casas = Math.min(12, Math.max(0, -Math.floor(Math.log10(step)) + 1))
  for (let v = 0; v <= top + step / 2; v += step) {
    ticks.push(Number(v.toFixed(casas)))
  }
  return ticks
}


export interface BudgetPct {
  
  value: number
  
  clamped: number
  
  over: boolean
}

export function pct(spent: number, budget: number): BudgetPct {
  if (!(budget > 0)) return { value: 0, clamped: 0, over: false }
  const value = (spent / budget) * 100
  return {
    value: r2(value),
    clamped: r2(clamp(value, 0, 100)),
    over: spent > budget,
  }
}


export function maxOf(values: number[]): number {
  let m = 0
  for (const v of values) if (v > m) m = v
  return m
}


export function fmtUsd(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}


export function fmtAxis(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: n < 10 ? 1 : 0 })
}


export interface Bar {
  x: number
  y: number
  width: number
  height: number
}


const BAR_GAP = 0.25


export function buildBars(values: number[], w: number, h: number, max: number): Bar[] {
  const n = values.length
  if (n === 0) return []
  const safeMax = max > 0 ? max : 1 
  const slot = w / n
  const gap = slot * BAR_GAP
  const width = slot - gap

  return values.map((v, i) => {
    const height = clamp(v / safeMax, 0, 1) * h
    const x = i * slot + gap / 2
    const y = h - height
    return { x: r2(x), y: r2(y), width: r2(width), height: r2(height) }
  })
}


export interface FunnelStep {
  label: string
  count: number
}


export interface FunnelRect {
  label: string
  count: number
  x: number
  y: number
  width: number
  height: number
  
  rate: number
}


const FUNNEL_GAP = 0.18


export function funnelRects(steps: FunnelStep[], w: number, h: number): FunnelRect[] {
  const n = steps.length
  if (n === 0) return []
  const base = steps[0].count > 0 ? steps[0].count : 1 
  const rowH = h / n
  const gap = rowH * FUNNEL_GAP
  const height = rowH - gap

  return steps.map((s, i) => {
    const width = clamp(s.count / base, 0, 1) * w
    const x = (w - width) / 2 
    const y = i * rowH + gap / 2
    const prev = i === 0 ? undefined : steps[i - 1].count
    const rate = i === 0 ? 1 : prev !== undefined && prev > 0 ? s.count / prev : 0
    return {
      label: s.label,
      count: s.count,
      x: r2(x),
      y: r2(y),
      width: r2(width),
      height: r2(height),
      rate,
    }
  })
}
