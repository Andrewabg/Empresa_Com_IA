






import { caixaSegura, type Caixa } from '@/lib/design/zonaSegura'
import type { CoresDaPeca } from '@/lib/design/coresDaPeca'
import type { BlocoDeArte, CamadaDeTemplate, FaixaDeTemplate, TemplateDeArte } from '@/lib/design/templates/tipos'
import { montarCaixaDeTexto } from './texto'
import type { CaixaDeTexto, Medidor } from './tipos'


const FOLGA_PILULA = { x: 0.62, y: 0.45 }

export interface CamadaResolvida {
  tipo: CamadaDeTemplate['tipo']
  x: number; y: number; w: number; h: number
  cor: string
  opacidade: number
  sentido?: 'para-cima' | 'para-baixo'
  
  raio: number
}

export interface Pilula { x: number; y: number; w: number; h: number; cor: string; raio: number }

export interface CaixaResolvida extends CaixaDeTexto {
  bloco: BlocoDeArte
  
  cor: string | 'auto'
  
  aceitaVeu: boolean
  pilula?: Pilula
}

export interface LayoutResolvido {
  camadas: CamadaResolvida[]
  caixas: CaixaResolvida[]
  
  avisos: string[]
}


function aplicarAncora(ref: Caixa, a: { x: number; y: number; w: number; h: number }): Caixa {
  return { x: ref.x + ref.w * a.x, y: ref.y + ref.h * a.y, w: ref.w * a.w, h: ref.h * a.h }
}


function arredondarCaixa(c: Caixa): Caixa {
  const x = Math.round(c.x)
  const y = Math.round(c.y)
  return { x, y, w: Math.round(c.x + c.w) - x, h: Math.round(c.y + c.h) - y }
}

function corDaCamada(papel: CamadaDeTemplate['papel'], cores: CoresDaPeca): string {
  return papel === 'destaque' ? cores.destaque : papel === 'botao' ? cores.botao : cores.fundo
}

function corDaFaixa(f: FaixaDeTemplate, cores: CoresDaPeca): string | 'auto' {
  switch (f.cor) {
    case 'sobreFundo': return cores.sobreFundo
    case 'destaque': return cores.destaque
    case 'sobreBotao': return cores.sobreBotao
    default: return 'auto'
  }
}


function prender(r: Caixa, dentro: Caixa): Caixa {
  const w = Math.min(r.w, dentro.w)
  const h = Math.min(r.h, dentro.h)
  return {
    w, h,
    x: Math.max(dentro.x, Math.min(r.x, dentro.x + dentro.w - w)),
    y: Math.max(dentro.y, Math.min(r.y, dentro.y + dentro.h - h)),
  }
}

export interface ArgsDoLayout {
  template: TemplateDeArte
  formato: string
  largura: number
  altura: number
  
  blocos: Partial<Record<BlocoDeArte, string>>
  cores: CoresDaPeca
  fontes: { display: string; corpo: string }
  medir: Medidor
}


export function montarLayout(args: ArgsDoLayout): LayoutResolvido {
  const peca: Caixa = { x: 0, y: 0, w: args.largura, h: args.altura }
  const segura = caixaSegura(args.formato, args.largura, args.altura)
  const avisos: string[] = []

  const camadas: CamadaResolvida[] = args.template.camadas.map((c) => {
    
    
    
    const r = arredondarCaixa(aplicarAncora(peca, c.ancora))
    return {
      tipo: c.tipo,
      x: r.x, y: r.y, w: r.w, h: r.h,
      cor: corDaCamada(c.papel, args.cores),
      opacidade: c.opacidade,
      ...(c.sentido ? { sentido: c.sentido } : {}),
      raio: (c.raio ?? 0) * args.largura,
    }
  })

  const caixas: CaixaResolvida[] = []
  for (const f of args.template.faixas) {
    const cru = (args.blocos[f.bloco] ?? '').trim()
    if (!cru) continue
    const texto = f.caixaAlta ? cru.toLocaleUpperCase('pt-BR') : cru

    const alvo = aplicarAncora(segura, f.ancora)
    const familia = f.papel === 'display' ? args.fontes.display : args.fontes.corpo
    const bloco = montarCaixaDeTexto({
      texto,
      caixa: alvo,
      familia,
      peso: f.peso,
      min: Math.round(args.largura * f.escala.min),
      max: Math.round(args.largura * f.escala.max),
      maxLinhas: f.maxLinhas,
      entrelinha: f.entrelinha,
      medir: args.medir,
      alinhamento: f.alinhamento,
      alinhamentoV: f.alinhamentoV,
    })
    if (!bloco.coube) {
      avisos.push(`O texto de ${rotuloDoBloco(f.bloco)} é comprido demais para este layout e saiu apertado. Encurtar ajuda.`)
    }

    const resolvida: CaixaResolvida = {
      ...bloco,
      bloco: f.bloco,
      cor: corDaFaixa(f, args.cores),
      aceitaVeu: f.veu === true,
    }

    if (f.pilula) {
      const px = bloco.tamanho * FOLGA_PILULA.x
      const py = bloco.tamanho * FOLGA_PILULA.y
      const bruta: Caixa = {
        x: bloco.caixa.x - px, y: bloco.caixa.y - py,
        w: bloco.caixa.w + px * 2, h: bloco.caixa.h + py * 2,
      }
      const presa = prender(bruta, segura)
      resolvida.pilula = { ...presa, cor: args.cores.botao, raio: presa.h / 2 }
      
      
      resolvida.caixa = {
        ...bloco.caixa,
        x: bloco.caixa.x + (presa.x - bruta.x),
        y: bloco.caixa.y + (presa.y - bruta.y),
      }
    }

    caixas.push(resolvida)
  }

  if (!caixas.some((c) => c.bloco === 'headline')) {
    avisos.push('Esta arte saiu sem headline.')
  }

  return { camadas, caixas, avisos }
}

function rotuloDoBloco(b: BlocoDeArte): string {
  return b === 'headline' ? 'título' : b === 'subheadline' ? 'apoio' : b === 'cta' ? 'botão' : 'selo'
}
