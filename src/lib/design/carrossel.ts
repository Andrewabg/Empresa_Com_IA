












import {
  TEMPLATE_CAPA_CARROSSEL, TEMPLATE_FECHAMENTO_CARROSSEL, alternarTemplatesDoMiolo,
} from '@/lib/design/templates'
import { ehPapelDeSlide, type PapelDoSlide } from '@/lib/design/types'


export const SLIDES_MIN = 5
export const SLIDES_MAX = 10


export const RENDERS_POR_CARROSSEL = 2


export interface SlideCru {
  papel: string
  template: string
  headline: string
  subheadline: string
  cta: string
  selo: string
  
  promptFundo: string
}

export interface SlidePlanejado {
  
  ordem: number
  papel: PapelDoSlide
  template: string
  blocos: { headline?: string; subheadline?: string; cta?: string; selo?: string }
  
  promptFundo: string
}

export interface RoteiroDeSlides {
  slides: SlidePlanejado[]
  
  avisos: string[]
}

export const COPY_CARROSSEL = {
  poucosSlides: (n: number, minimo: number) =>
    `Saíram ${n} slides e um carrossel se sustenta a partir de ${minimo}. Dá para pedir mais alguns argumentos que eu completo a série.`,
  capaSemCena: 'A capa saiu sem cena, então ela nasceu num campo de cor da marca em vez de foto.',
} as const

const limpar = (s: unknown): string => (typeof s === 'string' ? s.trim() : '')


function temConteudo(c: SlideCru): boolean {
  return !!(limpar(c?.headline) || limpar(c?.subheadline) || limpar(c?.cta) || limpar(c?.selo))
}

function papelDeclarado(raw: string): PapelDoSlide {
  const p = limpar(raw).toLowerCase()
  return ehPapelDeSlide(p) ? p : 'miolo'
}


export function montarRoteiroDeSlides(crus: SlideCru[], teto: number): RoteiroDeSlides {
  const avisos: string[] = []
  const validos = (crus ?? []).filter(temConteudo).slice(0, Math.max(1, teto))
  if (!validos.length) return { slides: [], avisos }

  const ultimo = validos.length - 1
  
  
  
  const iProva = validos.findIndex((c, i) => i > 0 && i < ultimo && papelDeclarado(c.papel) === 'prova' && !!limpar(c.promptFundo))

  const pedidosDoMiolo = validos.slice(1, ultimo).map((c) => limpar(c.template))
  const templatesDoMiolo = alternarTemplatesDoMiolo(pedidosDoMiolo)

  const slides = validos.map((c, i) => {
    const ehCapa = i === 0
    const ehFechamento = i === ultimo && ultimo > 0
    const ehProva = i === iProva
    const papel: PapelDoSlide = ehCapa ? 'capa' : ehFechamento ? 'cta' : ehProva ? 'prova' : 'miolo'
    const template = ehCapa
      ? TEMPLATE_CAPA_CARROSSEL
      : ehFechamento
        ? TEMPLATE_FECHAMENTO_CARROSSEL
        : templatesDoMiolo[i - 1]!
    const headline = limpar(c.headline)
    const subheadline = limpar(c.subheadline)
    const cta = ehFechamento ? limpar(c.cta) : ''
    const selo = limpar(c.selo)
    return {
      ordem: i + 1,
      papel,
      template,
      blocos: {
        ...(headline ? { headline } : {}),
        ...(subheadline ? { subheadline } : {}),
        ...(cta ? { cta } : {}),
        ...(selo ? { selo } : {}),
      },
      promptFundo: ehCapa || ehProva ? limpar(c.promptFundo) : '',
    } satisfies SlidePlanejado
  })

  if (!slides[0]!.promptFundo) avisos.push(COPY_CARROSSEL.capaSemCena)
  return { slides, avisos }
}


export function renderesDoRoteiro(slides: SlidePlanejado[]): number {
  return (slides ?? []).filter((s) => !!s.promptFundo).length
}


export function nomeDoArquivoDoSlide(ordem: number, papel: PapelDoSlide): string {
  const n = Math.max(1, Math.floor(Number.isFinite(ordem) ? ordem : 1))
  return `${String(n).padStart(2, '0')}-${papel}.png`
}


export function nomeDoPacote(titulo: string): string {
  const base = (titulo ?? '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `${base || 'carrossel'}.zip`
}
