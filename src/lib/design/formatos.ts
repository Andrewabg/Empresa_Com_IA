












export interface PontoDeFoco {
  
  x: number
  y: number
}

export interface FormatoDesign {
  slug: string
  nome: string          
  uso: string           
  largura: number       
  altura: number        
  size: string          
  alvoLargura: number   
  alvoAltura: number
  foco: PontoDeFoco
  dicas: string[]       
}

export const FORMATOS_DESIGN: FormatoDesign[] = [
  {
    slug: 'post-quadrado', nome: 'Post quadrado', uso: 'feed 1:1',
    largura: 1088, altura: 1088, size: '1088x1088',
    alvoLargura: 1080, alvoAltura: 1080, foco: { x: 0.5, y: 0.5 },
    dicas: ['Anúncio 1:1: headline em faixa no topo OU no rodapé; CTA como botão perto da headline', 'Cena/sujeito no centro sem competir com o texto; legível em miniatura de feed'],
  },
  {
    slug: 'post-feed', nome: 'Post de feed', uso: 'feed 4:5',
    largura: 1088, altura: 1360, size: '1088x1360',
    alvoLargura: 1080, alvoAltura: 1350, foco: { x: 0.5, y: 0.45 },
    dicas: ['Anúncio vertical 4:5: headline no terço superior, prova/sujeito no meio, CTA em botão no rodapé', 'Margem de respiro nas bordas; texto grande e legível'],
  },
  {
    slug: 'story', nome: 'Story / Reels', uso: 'vertical ~9:16',
    largura: 1088, altura: 1936, size: '1088x1936',
    
    
    alvoLargura: 1080, alvoAltura: 1920, foco: { x: 0.5, y: 0.4 },
    dicas: ['Zona segura do Story: topo ~250px e rodapé ~320px recebem a UI do app — headline no terço superior DENTRO da zona segura, CTA em botão acima do rodapé seguro', 'Texto GRANDE (lido em 1s); sujeito ao fundo sem cobrir o texto'],
  },
  {
    
    
    
    slug: 'carrossel', nome: 'Carrossel', uso: 'sequência de slides 4:5',
    largura: 1088, altura: 1360, size: '1088x1360',
    alvoLargura: 1080, alvoAltura: 1350, foco: { x: 0.5, y: 0.45 },
    dicas: ['Capa com a promessa e o convite a deslizar; miolo com um argumento por slide; último slide com a chamada para ação', 'Mesma grade, mesma paleta e mesma tipografia do primeiro ao último slide'],
  },
  {
    slug: 'anuncio-paisagem', nome: 'Anúncio (paisagem)', uso: 'link ad ~1.91:1',
    largura: 1216, altura: 640, size: '1216x640',
    alvoLargura: 1200, alvoAltura: 628, foco: { x: 0.5, y: 0.5 },
    dicas: ['Composição horizontal com ponto focal à esquerda ou direita', 'Espaço negativo pra headline sobreposta pela plataforma'],
  },
]

export const FORMATO_DESIGN_DEFAULT = 'post-quadrado'


export function getFormatoDesign(slug: string): FormatoDesign {
  const s = (slug ?? '').trim().toLowerCase()
  return FORMATOS_DESIGN.find((f) => f.slug === s) ?? FORMATOS_DESIGN.find((f) => f.slug === FORMATO_DESIGN_DEFAULT)!
}


export function inferirFormatoDesign(texto: string): string {
  const t = (texto ?? '').toLowerCase()
  
  
  if (/carroussel|carrossel|carousel|\bcarrocel\b|sequ[êe]ncia de slides|\bslides?\b/.test(t)) return 'carrossel'
  if (/stor(y|ies)|\breels?\b|vertical|9\s*[:x/]\s*16/.test(t)) return 'story'
  if (/paisagem|horizontal|1[.,]91|link\s*ad|\bbanner\b/.test(t)) return 'anuncio-paisagem'
  if (/4\s*[:x/]\s*5|retrato/.test(t)) return 'post-feed'
  return FORMATO_DESIGN_DEFAULT
}


export function aspectRatioDoSize(size: string | null | undefined): number | null {
  const m = /^(\d{2,5})x(\d{2,5})$/.exec((size ?? '').trim())
  if (!m) return null
  const l = Number(m[1]); const a = Number(m[2])
  if (!l || !a) return null
  const r = l / a
  return r >= 0.25 && r <= 4 ? r : null
}


export function aspectRatioDoFormato(slug: string): number {
  const f = getFormatoDesign(slug)
  return f.largura / f.altura
}

export interface TamanhoAlvo { largura: number; altura: number; size: string }


export function tamanhoAlvo(slug: string): TamanhoAlvo {
  const f = getFormatoDesign(slug)
  return { largura: f.alvoLargura, altura: f.alvoAltura, size: `${f.alvoLargura}x${f.alvoAltura}` }
}


export function renderSize(slug: string): string {
  return getFormatoDesign(slug).size
}

export interface Recorte { sx: number; sy: number; sw: number; sh: number; dw: number; dh: number }


export function recorteCover(args: {
  origemLargura: number; origemAltura: number
  alvoLargura: number; alvoAltura: number
  foco?: PontoDeFoco
}): Recorte {
  const { origemLargura: ow, origemAltura: oh, alvoLargura: dw, alvoAltura: dh } = args
  const foco = args.foco ?? { x: 0.5, y: 0.5 }
  
  const escala = Math.max(dw / ow, dh / oh)
  
  const sw = Math.min(ow, dw / escala)
  const sh = Math.min(oh, dh / escala)
  const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v))
  const sx = clamp(ow * foco.x - sw / 2, ow - sw)
  const sy = clamp(oh * foco.y - sh / 2, oh - sh)
  return { sx, sy, sw, sh, dw, dh }
}
