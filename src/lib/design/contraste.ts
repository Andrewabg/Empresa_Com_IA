










export const CONTRASTE_MINIMO = 4.5

export const PASSO_SCRIM = 0.05

export interface Rgb { r: number; g: number; b: number }


export function hexParaRgb(hex: string | null | undefined): Rgb | null {
  const s = (hex ?? '').trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    return { r: parseInt(s[0]! + s[0]!, 16), g: parseInt(s[1]! + s[1]!, 16), b: parseInt(s[2]! + s[2]!, 16) }
  }
  if (/^[0-9a-fA-F]{6}$/.test(s)) {
    return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) }
  }
  return null
}

export function rgbParaHex(c: Rgb): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`
}

const canal = (v: number): number => {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}


export function luminanciaRelativa(c: Rgb): number {
  return 0.2126 * canal(c.r) + 0.7152 * canal(c.g) + 0.0722 * canal(c.b)
}


export function razaoDeContraste(a: Rgb, b: Rgb): number {
  const la = luminanciaRelativa(a)
  const lb = luminanciaRelativa(b)
  const claro = Math.max(la, lb)
  const escuro = Math.min(la, lb)
  return (claro + 0.05) / (escuro + 0.05)
}


export function misturar(fundo: Rgb, frente: Rgb, alfa: number): Rgb {
  const a = Math.max(0, Math.min(1, alfa))
  return {
    r: fundo.r + (frente.r - fundo.r) * a,
    g: fundo.g + (frente.g - fundo.g) * a,
    b: fundo.b + (frente.b - fundo.b) * a,
  }
}

export const TEXTO_CLARO = '#FFFFFF'
export const TEXTO_ESCURO = '#111111'


export function melhorTextoSobre(fundo: Rgb, claro = TEXTO_CLARO, escuro = TEXTO_ESCURO): string {
  const c = hexParaRgb(claro)
  const e = hexParaRgb(escuro)
  if (!c) return escuro
  if (!e) return claro
  return razaoDeContraste(fundo, e) > razaoDeContraste(fundo, c) ? escuro : claro
}

export interface PlanoDeLegibilidade {
  
  corDoTexto: string
  
  scrim: number
  
  razao: number
  
  legivel: boolean
}


export function planoDeLegibilidade(args: {
  fundoMedio: Rgb
  corDoScrim?: string
  claro?: string
  escuro?: string
  alvo?: number
}): PlanoDeLegibilidade {
  const alvo = args.alvo ?? CONTRASTE_MINIMO
  const scrimRgb = hexParaRgb(args.corDoScrim ?? '#000000') ?? { r: 0, g: 0, b: 0 }
  const claro = args.claro ?? TEXTO_CLARO
  const escuro = args.escuro ?? TEXTO_ESCURO

  const corDoTexto = melhorTextoSobre(args.fundoMedio, claro, escuro)
  const textoRgb = hexParaRgb(corDoTexto)!

  let melhor: PlanoDeLegibilidade = {
    corDoTexto,
    scrim: 0,
    razao: razaoDeContraste(args.fundoMedio, textoRgb),
    legivel: false,
  }
  melhor.legivel = melhor.razao >= alvo
  if (melhor.legivel) return melhor

  for (let a = PASSO_SCRIM; a <= 1.0000001; a += PASSO_SCRIM) {
    const alfa = Math.min(1, Number(a.toFixed(4)))
    const fundo = misturar(args.fundoMedio, scrimRgb, alfa)
    
    
    const cor = melhorTextoSobre(fundo, claro, escuro)
    const razao = razaoDeContraste(fundo, hexParaRgb(cor)!)
    if (razao > melhor.razao) melhor = { corDoTexto: cor, scrim: alfa, razao, legivel: razao >= alvo }
    if (melhor.legivel) return melhor
  }
  return melhor
}


export function tomMedio(pixels: Uint8ClampedArray | number[]): Rgb | null {
  let r = 0, g = 0, b = 0, n = 0
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    const alfa = pixels[i + 3]!
    if (alfa === 0) continue
    r += pixels[i]!; g += pixels[i + 1]!; b += pixels[i + 2]!; n++
  }
  if (!n) return null
  return { r: r / n, g: g / n, b: b / n }
}
