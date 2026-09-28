












export type PixelsRGBA = Uint8ClampedArray | number[]

export interface CorExtraida {
  hex: string
  
  peso: number
}

export interface OpcoesPaleta {
  
  k?: number
  
  alfaMinimo?: number
  
  iteracoes?: number
}

const K_PADRAO = 5
const ALFA_MINIMO = 200
const ITERACOES = 12

const LUM_MIN = 18
const LUM_MAX = 237

const SAT_MIN = 12

const clamp255 = (n: number): number => (n < 0 ? 0 : n > 255 ? 255 : Math.round(n))

export function paraHex(r: number, g: number, b: number): string {
  const h = (n: number) => clamp255(n).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase()
}


function luminancia(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}


export function saturacao(r: number, g: number, b: number): number {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
  if (mx === mn) return 0
  const l = (mx + mn) / 2 / 255
  const d = (mx - mn) / 255
  return (l > 0.5 ? d / (2 - mx / 255 - mn / 255) : d / (mx / 255 + mn / 255)) * 100
}

interface Ponto { r: number; g: number; b: number }


export function extrairPaleta(pixels: PixelsRGBA, opts: OpcoesPaleta = {}): CorExtraida[] {
  const k = Math.max(1, Math.min(8, opts.k ?? K_PADRAO))
  const alfaMin = opts.alfaMinimo ?? ALFA_MINIMO
  const iter = opts.iteracoes ?? ITERACOES

  const amostra: Ponto[] = []
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], a = pixels[i + 3]
    if (a < alfaMin) continue
    const lum = luminancia(r, g, b)
    if (lum < LUM_MIN || lum > LUM_MAX) continue
    if (saturacao(r, g, b) < SAT_MIN) continue
    amostra.push({ r, g, b })
  }
  if (!amostra.length) return []

  
  
  
  
  const passo = Math.max(1, Math.floor(amostra.length / k))
  const centros: Ponto[] = []
  for (let i = 0; i < k; i++) centros.push(amostra[(i * passo) % amostra.length])

  const donos = new Array<number>(amostra.length).fill(0)
  for (let it = 0; it < iter; it++) {
    let mudou = false
    for (let i = 0; i < amostra.length; i++) {
      const p = amostra[i]
      let melhor = 0, melhorD = Infinity
      for (let c = 0; c < centros.length; c++) {
        const q = centros[c]
        const d = (p.r - q.r) ** 2 + (p.g - q.g) ** 2 + (p.b - q.b) ** 2
        if (d < melhorD) { melhorD = d; melhor = c }
      }
      if (donos[i] !== melhor) { donos[i] = melhor; mudou = true }
    }
    if (!mudou && it > 0) break
    const soma = centros.map(() => ({ r: 0, g: 0, b: 0, n: 0 }))
    for (let i = 0; i < amostra.length; i++) {
      const s = soma[donos[i]], p = amostra[i]
      s.r += p.r; s.g += p.g; s.b += p.b; s.n++
    }
    for (let c = 0; c < centros.length; c++) {
      
      
      if (soma[c].n === 0) continue
      centros[c] = { r: soma[c].r / soma[c].n, g: soma[c].g / soma[c].n, b: soma[c].b / soma[c].n }
    }
  }

  const contagem = centros.map(() => 0)
  for (const d of donos) contagem[d]++
  const total = amostra.length
  
  
  
  
  
  const porHex = new Map<string, number>()
  for (let c = 0; c < centros.length; c++) {
    if (!contagem[c]) continue
    const hex = paraHex(centros[c].r, centros[c].g, centros[c].b)
    porHex.set(hex, (porHex.get(hex) ?? 0) + contagem[c] / total)
  }
  const out: CorExtraida[] = [...porHex].map(([hex, peso]) => ({ hex, peso }))
  
  return out.sort((a, b) => (b.peso - a.peso) || a.hex.localeCompare(b.hex))
}


export function coresNovas(
  sugestao: CorExtraida[], paletaAtual: { hex: string }[] | undefined, limite = 4,
): CorExtraida[] {
  const jaTem = new Set((paletaAtual ?? []).map((c) => (c.hex ?? '').trim().toLowerCase()))
  const out: CorExtraida[] = []
  const vistos = new Set<string>()
  for (const c of sugestao ?? []) {
    const k = (c.hex ?? '').trim().toLowerCase()
    if (!k || jaTem.has(k) || vistos.has(k)) continue
    vistos.add(k)
    out.push(c)
    if (out.length >= limite) break
  }
  return out
}
