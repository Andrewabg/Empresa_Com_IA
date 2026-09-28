


export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

const r2 = (v: number) => Math.round(v * 100) / 100


export function caminhoCotovelo(pai: Rect, filho: Rect): string {
  const x1 = r2(pai.x + pai.width / 2)
  const y1 = r2(pai.y + pai.height)
  const x2 = r2(filho.x + filho.width / 2)
  const y2 = r2(filho.y)
  if (Math.abs(x1 - x2) < 0.5) return `M ${x1} ${y1} L ${x2} ${y2}`
  const meio = r2((y1 + y2) / 2)
  return `M ${x1} ${y1} C ${x1} ${meio}, ${x2} ${meio}, ${x2} ${y2}`
}
