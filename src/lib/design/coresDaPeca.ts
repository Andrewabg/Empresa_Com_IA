









import { hexParaRgb, luminanciaRelativa, melhorTextoSobre, razaoDeContraste, type Rgb } from './contraste'
import { saturacao } from './paletaDaLogo'
import type { CorPaleta, PapelDaCor } from './direcaoArte'


export const CORES_NEUTRAS = {
  fundo: '#111318',
  sobreFundo: '#FFFFFF',
  destaque: '#F5F5F5',
  botao: '#FFFFFF',
  sobreBotao: '#111318',
} as const

export interface CoresDaPeca {
  
  fundo: string
  
  sobreFundo: string
  
  destaque: string
  
  botao: string
  
  sobreBotao: string
}

const valido = (hex?: string): string | null => (hex && hexParaRgb(hex) ? hex.trim() : null)

function porPapel(paleta: CorPaleta[], papel: PapelDaCor): string | null {
  for (const c of paleta) if (c.papel === papel) { const v = valido(c.hex); if (v) return v }
  return null
}


function maisSaturada(paleta: CorPaleta[]): string | null {
  let melhor: { hex: string; s: number } | null = null
  for (const c of paleta) {
    const v = valido(c.hex)
    if (!v) continue
    const rgb = hexParaRgb(v)!
    const s = saturacao(rgb.r, rgb.g, rgb.b)
    if (!melhor || s > melhor.s) melhor = { hex: v, s }
  }
  return melhor?.hex ?? null
}

function maisEscura(paleta: CorPaleta[]): string | null {
  let melhor: { hex: string; l: number } | null = null
  for (const c of paleta) {
    const v = valido(c.hex)
    if (!v) continue
    const l = luminanciaRelativa(hexParaRgb(v)!)
    if (!melhor || l < melhor.l) melhor = { hex: v, l }
  }
  return melhor?.hex ?? null
}


export function resolverCoresDaPeca(paleta?: CorPaleta[] | null): CoresDaPeca {
  const cores = (paleta ?? []).filter((c) => valido(c.hex))
  if (!cores.length) return { ...CORES_NEUTRAS }

  const fundo = porPapel(cores, 'fundo') ?? maisEscura(cores) ?? CORES_NEUTRAS.fundo
  const destaque = porPapel(cores, 'destaque') ?? porPapel(cores, 'primaria') ?? maisSaturada(cores) ?? CORES_NEUTRAS.destaque
  const botao = porPapel(cores, 'destaque') ?? porPapel(cores, 'primaria') ?? maisSaturada(cores) ?? CORES_NEUTRAS.botao

  return {
    fundo,
    sobreFundo: corDeTextoSobre(fundo, cores),
    destaque,
    botao,
    sobreBotao: corDeTextoSobre(botao, cores),
  }
}


export function corDeTextoSobre(fundoHex: string, paleta: CorPaleta[]): string {
  const fundo: Rgb = hexParaRgb(fundoHex) ?? { r: 0, g: 0, b: 0 }
  const daMarca = porPapel(paleta, 'texto')
  if (daMarca) {
    const rgb = hexParaRgb(daMarca)!
    if (razaoDeContraste(fundo, rgb) >= 4.5) return daMarca
  }
  return melhorTextoSobre(fundo)
}
