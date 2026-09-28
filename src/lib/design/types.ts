
import type { ResultadoDoPortao } from '@/lib/qa/portoes'

export interface BriefEstruturado {
  pedido?: string
  objetivo?: string     
  publico?: string
  oferta?: string       
  angulo?: string       
  
  icp?: string
  
  mecanismo?: string
  
  nivelConsciencia?: string
  referenciaId?: string 
  usarRosto?: boolean
  restricoes?: string
}


export interface DocumentoDeArte {
  
  template: string
  blocos: { headline?: string; subheadline?: string; cta?: string; selo?: string }
  cores: { fundo: string; sobreFundo: string; destaque: string; botao: string; sobreBotao: string }
  fontes: { display: string; corpo: string }
  
  polimento?: 'cru' | 'produzido'
  
  fundoRef?: string
  
  foco?: { x: number; y: number }
  
  v: number
}


export const PAPEIS_DE_SLIDE = ['capa', 'miolo', 'prova', 'cta'] as const
export type PapelDoSlide = (typeof PAPEIS_DE_SLIDE)[number]

export function ehPapelDeSlide(v: string): v is PapelDoSlide {
  return (PAPEIS_DE_SLIDE as readonly string[]).includes(v)
}


export interface SlideDoCarrossel {
  
  ordem: number
  papel: PapelDoSlide
  documento: DocumentoDeArte
  
  artifactId: string
}

export interface VariacaoCriativo {
  conceito: string          
  promptImagem: string      
  artifactId: string        
  size: string              
  quality: 'low' | 'medium' | 'high'
  final?: boolean           
  
  framework?: string        
  headline?: string         
  subheadline?: string      
  cta?: string              
  
  arquetipo?: string
  
  documento?: DocumentoDeArte
  
  remixDe?: string
  
  slides?: SlideDoCarrossel[]
}

export interface VereditoCriativo { escolhida?: number; porque?: string }


export interface CriticaCriativo {
  aprovado?: boolean
  problemas?: string[]
  portoes?: ResultadoDoPortao[]
}


export interface CriativoView {
  id: string
  brandId: string
  formato: string
  titulo: string
  status: 'brief' | 'rascunho' | 'revisao' | 'aprovada' | 'arquivada'
  origem: string
  position: number
  versaoAtual: number
  variacoes: VariacaoCriativo[]
  veredito: VereditoCriativo
  
  critica: CriticaCriativo
  referenciaId?: string     
  brief?: BriefEstruturado
}


export function toCriativoView(
  peca: {
    id: string; brand_id: string; formato: string; titulo: string
    status: CriativoView['status']; origem: string; position: number
    brief?: unknown
  },
  versao: { n: number; variacoes: unknown; veredito: unknown; critica?: unknown } | undefined,
): CriativoView {
  const variacoes = Array.isArray(versao?.variacoes) ? (versao.variacoes as VariacaoCriativo[]) : []
  const veredito = (versao?.veredito && typeof versao.veredito === 'object' ? versao.veredito : {}) as VereditoCriativo
  const critica = (versao?.critica && typeof versao.critica === 'object' ? versao.critica : {}) as CriticaCriativo
  const b = (peca.brief && typeof peca.brief === 'object' ? peca.brief : {}) as BriefEstruturado
  const referenciaId = typeof b.referenciaId === 'string' ? b.referenciaId : undefined
  return {
    id: peca.id, brandId: peca.brand_id, formato: peca.formato, titulo: peca.titulo,
    status: peca.status, origem: peca.origem, position: peca.position,
    versaoAtual: versao?.n ?? 0, variacoes, veredito, critica,
    brief: b,
    ...(referenciaId ? { referenciaId } : {}),
  }
}
