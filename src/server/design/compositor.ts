
import type { Canvas, Image, SKRSContext2D } from '@napi-rs/canvas'
import { getFormatoDesign, recorteCover, tamanhoAlvo, type TamanhoAlvo } from '@/lib/design/formatos'
import { limparMetadadosDoPng } from '@/lib/design/pngChunks'
import { caixaSegura, invadeZonaDePerigo } from '@/lib/design/zonaSegura'
import {
  CONTRASTE_MINIMO,
  hexParaRgb,
  planoDeLegibilidade,
  razaoDeContraste,
  tomMedio,
  type Rgb,
} from '@/lib/design/contraste'
import type { FatoDoBloco } from '@/lib/qa/portoes'
import { fontShorthand, resolverFamilia } from '@/lib/design/fontes'
import { montarLayout, type CaixaResolvida, type CamadaResolvida } from '@/lib/design/layout/montar'
import { montarCaixaDeTexto } from '@/lib/design/layout/texto'
import type { Caixa, Medidor } from '@/lib/design/layout/tipos'
import { getTemplateDeArte, templateCru, type CantoDaMarca } from '@/lib/design/templates'
import type { DocumentoDeArte } from '@/lib/design/types'
import { garantirFontes } from './fontes'


const LARGURA_DO_LOGO = 0.16

const ALTURA_MAX_DO_LOGO = 0.09

const ESCALA_DA_ASSINATURA = { min: 0.018, max: 0.032 }

const FOLGA_DO_VEU = 0.012

const VEU_MINIMO_DO_LOGO = 0.28

const ESCALA_DO_LOGO_CRU = 0.55

const CANTO_PADRAO: CantoDaMarca = 'inferior-direita'

const COR_DE_CHAO = '#141418'

export interface MarcaNaPeca {
  
  logo?: Buffer | null
  
  logoMono?: Buffer | null
  
  nome?: string | null
  
  fonteDeCorpo?: string | null
}

export interface ArteComposta {
  png: Buffer
  largura: number
  altura: number
  
  avisos: string[]
  
  fatos: FatoDoBloco[]
}

type Fabrica = typeof import('@napi-rs/canvas')


export async function carregarImagem(canvasLib: Fabrica, bytes: Buffer): Promise<Image> {
  
  
  
  const img = await canvasLib.loadImage(limparMetadadosDoPng(bytes))
  if (!img?.width || !img.height) throw new Error('imagem sem dimensão após o decode')
  return img
}


function medidorDo(ctx: SKRSContext2D): Medidor {
  return (texto, fonte) => {
    ctx.font = fontShorthand(fonte)
    const m = ctx.measureText(texto)
    return {
      largura: m.width,
      ascento: m.actualBoundingBoxAscent ?? fonte.tamanho * 0.8,
      descenso: m.actualBoundingBoxDescent ?? fonte.tamanho * 0.2,
    }
  }
}


function tomDaRegiao(ctx: SKRSContext2D, caixa: Caixa, largura: number, altura: number): Rgb | null {
  const x = Math.max(0, Math.floor(caixa.x))
  const y = Math.max(0, Math.floor(caixa.y))
  const w = Math.max(1, Math.min(Math.ceil(caixa.w), largura - x))
  const h = Math.max(1, Math.min(Math.ceil(caixa.h), altura - y))
  try {
    return tomMedio(ctx.getImageData(x, y, w, h).data)
  } catch {
    return null
  }
}


function tomDeImagem(canvasLib: Fabrica, img: Image): Rgb | null {
  try {
    const lado = 32
    const cv = canvasLib.createCanvas(lado, lado)
    const c2 = cv.getContext('2d')
    c2.drawImage(img, 0, 0, lado, lado)
    return tomMedio(c2.getImageData(0, 0, lado, lado).data)
  } catch {
    return null
  }
}

function retanguloArredondado(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const raio = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + raio, y)
  ctx.lineTo(x + w - raio, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + raio)
  ctx.lineTo(x + w, y + h - raio)
  ctx.quadraticCurveTo(x + w, y + h, x + w - raio, y + h)
  ctx.lineTo(x + raio, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - raio)
  ctx.lineTo(x, y + raio)
  ctx.quadraticCurveTo(x, y, x + raio, y)
  ctx.closePath()
  ctx.fill()
}


function veu(ctx: SKRSContext2D, caixa: Caixa, cor: string, alfa: number, folga: number, limite?: Caixa): void {
  if (alfa <= 0) return
  let x = caixa.x - folga
  let y = caixa.y - folga
  let w = caixa.w + folga * 2
  let h = caixa.h + folga * 2
  if (limite) {
    const x2 = Math.min(x + w, limite.x + limite.w)
    const y2 = Math.min(y + h, limite.y + limite.h)
    x = Math.max(x, limite.x)
    y = Math.max(y, limite.y)
    w = Math.max(0, x2 - x)
    h = Math.max(0, y2 - y)
  }
  if (w <= 0 || h <= 0) return
  ctx.save()
  ctx.globalAlpha = alfa
  ctx.fillStyle = cor
  retanguloArredondado(ctx, x, y, w, h, folga * 1.4)
  ctx.restore()
}


const corDoVeu = (corDoTexto: string): string => (corDoTexto.toUpperCase() === '#FFFFFF' ? '#000000' : '#FFFFFF')

interface ContextoDaMarca {
  canvasLib: Fabrica
  ctx: SKRSContext2D
  marca: MarcaNaPeca
  segura: Caixa
  alvo: TamanhoAlvo
  canto: CantoDaMarca
  avisos: string[]
  
  cru: boolean
}


export async function comporArteFinal(args: {
  
  fundo?: Buffer | null
  formato: string
  marca?: MarcaNaPeca
  documento?: DocumentoDeArte | null
}): Promise<ArteComposta> {
  await garantirFontes()
  const canvasLib: Fabrica = await import('@napi-rs/canvas')

  const preset = getFormatoDesign(args.formato)
  const alvo = tamanhoAlvo(args.formato)
  const avisos: string[] = []
  const fatos: FatoDoBloco[] = []

  const canvas: Canvas = canvasLib.createCanvas(alvo.largura, alvo.altura)
  const ctx = canvas.getContext('2d')

  
  if (args.fundo) {
    const fundo = await carregarImagem(canvasLib, args.fundo)
    const r = recorteCover({
      origemLargura: fundo.width, origemAltura: fundo.height,
      alvoLargura: alvo.largura, alvoAltura: alvo.altura,
      
      foco: args.documento?.foco ?? preset.foco,
    })
    ctx.drawImage(fundo, r.sx, r.sy, r.sw, r.sh, 0, 0, r.dw, r.dh)
  } else {
    
    
    ctx.fillStyle = args.documento?.cores.fundo || COR_DE_CHAO
    ctx.fillRect(0, 0, alvo.largura, alvo.altura)
  }

  
  let canto: CantoDaMarca = CANTO_PADRAO
  const cru = args.documento?.polimento === 'cru'
  if (args.documento) {
    
    
    const template = cru ? templateCru(getTemplateDeArte(args.documento.template)) : getTemplateDeArte(args.documento.template)
    canto = template.marcaEm
    const display = resolverFamilia(args.documento.fontes.display, 'display')
    const corpo = resolverFamilia(args.documento.fontes.corpo, 'corpo')
    for (const f of [display, corpo]) {
      if (f.caiuNoPadrao && f.pedida) {
        avisos.push(`A fonte "${f.pedida}" não está no pacote do estúdio, então usei ${f.familia.rotulo}.`)
      }
    }
    const layout = montarLayout({
      template,
      formato: args.formato,
      largura: alvo.largura,
      altura: alvo.altura,
      blocos: args.documento.blocos,
      cores: args.documento.cores,
      fontes: { display: display.familia.familia, corpo: corpo.familia.familia },
      medir: medidorDo(ctx),
    })
    desenharCamadas(ctx, layout.camadas)
    fatos.push(...desenharCaixas(ctx, layout.caixas, alvo, caixaSegura(args.formato, alvo.largura, alvo.altura)))
    avisos.push(...layout.avisos)
  }

  
  const c: ContextoDaMarca = {
    canvasLib, ctx, marca: args.marca ?? {},
    segura: caixaSegura(args.formato, alvo.largura, alvo.altura),
    alvo, canto, avisos, cru,
  }
  const aplicouLogo = await aplicarLogo(c)
  if (!aplicouLogo) aplicarAssinatura(c)

  return { png: canvas.encodeSync('png'), largura: alvo.largura, altura: alvo.altura, avisos, fatos }
}


function desenharCamadas(ctx: SKRSContext2D, camadas: CamadaResolvida[]): void {
  for (const c of camadas) {
    ctx.save()
    if (c.tipo === 'gradiente') {
      
      
      const deY = c.sentido === 'para-cima' ? c.y + c.h : c.y
      const paraY = c.sentido === 'para-cima' ? c.y : c.y + c.h
      const g = ctx.createLinearGradient(c.x, deY, c.x, paraY)
      g.addColorStop(0, c.cor)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.globalAlpha = c.opacidade
      ctx.fillStyle = g
    } else {
      ctx.globalAlpha = c.opacidade
      ctx.fillStyle = c.cor
    }
    if (c.raio > 0) retanguloArredondado(ctx, c.x, c.y, c.w, c.h, c.raio)
    else ctx.fillRect(c.x, c.y, c.w, c.h)
    ctx.restore()
  }
}


function desenharCaixas(ctx: SKRSContext2D, caixas: CaixaResolvida[], alvo: TamanhoAlvo, segura: Caixa): FatoDoBloco[] {
  const medir = medidorDo(ctx)
  const fatos: FatoDoBloco[] = []
  for (const cx of caixas) {
    if (!cx.linhas.length) continue

    if (cx.pilula) {
      ctx.save()
      ctx.fillStyle = cx.pilula.cor
      retanguloArredondado(ctx, cx.pilula.x, cx.pilula.y, cx.pilula.w, cx.pilula.h, cx.pilula.raio)
      ctx.restore()
    }

    let cor = cx.cor
    if (cor === 'auto' || cx.aceitaVeu) {
      const tom = tomDaRegiao(ctx, cx.caixa, alvo.largura, alvo.altura)
      if (tom) {
        const plano = planoDeLegibilidade({ fundoMedio: tom })
        if (cor === 'auto') cor = plano.corDoTexto
        if (cx.aceitaVeu && plano.scrim > 0) {
          veu(ctx, cx.caixa, corDoVeu(plano.corDoTexto), plano.scrim, alvo.largura * FOLGA_DO_VEU, segura)
        }
      } else if (cor === 'auto') {
        cor = '#FFFFFF'
      }
    }

    
    const tomFinal = tomDaRegiao(ctx, cx.caixa, alvo.largura, alvo.altura)
    const corRgb = hexParaRgb(cor)
    fatos.push({
      bloco: cx.bloco,
      coube: cx.coube,
      foraDaZona: invadeZonaDePerigo(cx.caixa, segura),
      ...(tomFinal && corRgb ? { razao: razaoDeContraste(tomFinal, corRgb) } : {}),
    })

    ctx.save()
    ctx.fillStyle = cor
    ctx.font = fontShorthand({ familia: cx.familia, peso: cx.peso, tamanho: cx.tamanho })
    ctx.textBaseline = 'top'
    let y = cx.caixa.y
    for (const linha of cx.linhas) {
      const w = medir(linha, { familia: cx.familia, peso: cx.peso, tamanho: cx.tamanho }).largura
      const x =
        cx.alinhamento === 'centro' ? cx.caixa.x + (cx.caixa.w - w) / 2
        : cx.alinhamento === 'direita' ? cx.caixa.x + (cx.caixa.w - w)
        : cx.caixa.x
      ctx.fillText(linha, x, y)
      y += cx.alturaDeLinha
    }
    ctx.restore()
  }
  return fatos
}


function cantoDaCaixa(segura: Caixa, canto: CantoDaMarca, w: number, h: number): Caixa {
  const direita = canto === 'superior-direita' || canto === 'inferior-direita'
  const embaixo = canto === 'inferior-direita' || canto === 'inferior-esquerda'
  return {
    x: direita ? segura.x + segura.w - w : segura.x,
    y: embaixo ? segura.y + segura.h - h : segura.y,
    w, h,
  }
}


async function aplicarLogo(c: ContextoDaMarca): Promise<boolean> {
  if (!c.marca.logo && !c.marca.logoMono) return false

  const abrir = async (bytes: Buffer | null | undefined): Promise<Image | null> => {
    if (!bytes) return null
    try { return await carregarImagem(c.canvasLib, bytes) } catch { return null }
  }
  const colorida = await abrir(c.marca.logo)
  const mono = await abrir(c.marca.logoMono)
  if (!colorida && !mono) {
    c.avisos.push('O arquivo do logo não abriu, então finalizei a arte sem ele.')
    return false
  }

  
  const base = colorida ?? mono!
  let w = Math.round(c.alvo.largura * LARGURA_DO_LOGO * (c.cru ? ESCALA_DO_LOGO_CRU : 1))
  let h = (base.height / base.width) * w
  const hMax = c.alvo.altura * ALTURA_MAX_DO_LOGO
  if (h > hMax) { h = hMax; w = (base.width / base.height) * h }
  const caixa = cantoDaCaixa(c.segura, c.canto, w, h)

  
  
  const tomFundo = tomDaRegiao(c.ctx, caixa, c.alvo.largura, c.alvo.altura)
  let escolhida = colorida ?? mono!
  if (tomFundo) {
    const razaoDe = (img: Image | null): number => {
      const t = img ? tomDeImagem(c.canvasLib, img) : null
      return t ? razaoDeContraste(tomFundo, t) : CONTRASTE_MINIMO
    }
    let razao = razaoDe(escolhida)
    if (razao < CONTRASTE_MINIMO && colorida && mono) {
      const alternativa = escolhida === colorida ? mono : colorida
      const razaoAlt = razaoDe(alternativa)
      if (razaoAlt > razao) { escolhida = alternativa; razao = razaoAlt }
    }
    
    
    if (razao < CONTRASTE_MINIMO) {
      const plano = planoDeLegibilidade({ fundoMedio: tomFundo })
      veu(c.ctx, caixa, corDoVeu(plano.corDoTexto), Math.max(VEU_MINIMO_DO_LOGO, plano.scrim), c.alvo.largura * FOLGA_DO_VEU, c.segura)
    }
  }

  c.ctx.drawImage(escolhida, caixa.x, caixa.y, caixa.w, caixa.h)
  return true
}


function aplicarAssinatura(c: ContextoDaMarca): void {
  const nome = (c.marca.nome ?? '').trim()
  if (!nome) return

  const familia = resolverFamilia(c.marca.fonteDeCorpo, 'corpo')
  if (familia.caiuNoPadrao && familia.pedida && !c.avisos.some((a) => a.includes(familia.pedida!))) {
    c.avisos.push(`A fonte "${familia.pedida}" não está no pacote do estúdio, então usei ${familia.familia.rotulo}.`)
  }

  const medir = medidorDo(c.ctx)
  const alturaFaixa = c.alvo.altura * 0.06
  const direita = c.canto === 'superior-direita' || c.canto === 'inferior-direita'
  const bloco = montarCaixaDeTexto({
    texto: nome,
    caixa: cantoDaCaixa(c.segura, c.canto, c.segura.w, alturaFaixa),
    familia: familia.familia.familia,
    peso: 600,
    min: Math.round(c.alvo.largura * ESCALA_DA_ASSINATURA.min),
    max: Math.round(c.alvo.largura * ESCALA_DA_ASSINATURA.max),
    maxLinhas: 1,
    entrelinha: 1.2,
    medir,
    alinhamento: direita ? 'direita' : 'esquerda',
    alinhamentoV: 'base',
  })
  if (!bloco.linhas.length) return
  if (!bloco.coube) {
    c.avisos.push('O nome da marca é comprido demais para assinar a peça, então deixei a arte sem assinatura.')
    return
  }

  const tom = tomDaRegiao(c.ctx, bloco.caixa, c.alvo.largura, c.alvo.altura)
  const plano = tom
    ? planoDeLegibilidade({ fundoMedio: tom })
    : { corDoTexto: '#FFFFFF', scrim: 0.35, razao: 0, legivel: false }
  if (plano.scrim > 0) {
    veu(c.ctx, bloco.caixa, corDoVeu(plano.corDoTexto), plano.scrim, c.alvo.largura * FOLGA_DO_VEU, c.segura)
  }

  c.ctx.save()
  c.ctx.fillStyle = plano.corDoTexto
  c.ctx.font = fontShorthand({ familia: bloco.familia, peso: bloco.peso, tamanho: bloco.tamanho })
  c.ctx.textBaseline = 'top'
  let y = bloco.caixa.y
  for (const linha of bloco.linhas) {
    const w = medir(linha, { familia: bloco.familia, peso: bloco.peso, tamanho: bloco.tamanho }).largura
    const x = direita ? bloco.caixa.x + (bloco.caixa.w - w) : bloco.caixa.x
    c.ctx.fillText(linha, x, y)
    y += bloco.alturaDeLinha
  }
  c.ctx.restore()
}
