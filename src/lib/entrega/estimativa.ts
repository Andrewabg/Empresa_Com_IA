




















import { ehRoteiro, getFormato } from '@/lib/estudio/formatos'
import type { PedidoDeEntrega } from './types'

export interface TabelaDeCusto {
  
  planejar: number
  
  copy: number
  
  arte: number
  
  finalizar: number
}

export const TABELA_PADRAO: TabelaDeCusto = { planejar: 0.017, copy: 0.023, arte: 0.078, finalizar: 0.19 }


export const TETO_DE_PECAS_POR_ENTREGA = 20

export interface LinhaDaEstimativa { rotulo: string; quantidade: number; usd: number }

export interface Estimativa {
  linhas: LinhaDaEstimativa[]
  
  usd: number
  totalDePecas: number
  
  finalizarCadaUma: number
}


export function totalDePecas(quantidades: Record<string, number>): number {
  return Object.values(quantidades ?? {}).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0)
}


export function pecasComArte(quantidades: Record<string, number>): number {
  return Object.entries(quantidades ?? {})
    .filter(([slug]) => !ehRoteiro(getFormato(slug)))
    .reduce((a, [, n]) => a + (Number.isFinite(n) ? n : 0), 0)
}

export function estimarEntrega(pedido: PedidoDeEntrega, tabela: TabelaDeCusto = TABELA_PADRAO): Estimativa {
  const n = totalDePecas(pedido.quantidades)
  const comArte = pedido.comArte ? pecasComArte(pedido.quantidades) : 0
  const linhas: LinhaDaEstimativa[] = []
  if (n > 0) linhas.push({ rotulo: 'Montar o plano', quantidade: 1, usd: tabela.planejar })
  if (n > 0) linhas.push({ rotulo: 'Escrever as peças', quantidade: n, usd: n * tabela.copy })
  if (comArte > 0) linhas.push({ rotulo: 'Desenhar as artes', quantidade: comArte, usd: comArte * tabela.arte })
  return {
    linhas,
    usd: linhas.reduce((a, l) => a + l.usd, 0),
    totalDePecas: n,
    finalizarCadaUma: tabela.finalizar,
  }
}

export interface AparaNoTeto { quantidades: Record<string, number>; cortou: number }


export function aparaNoTeto(quantidades: Record<string, number>, teto = TETO_DE_PECAS_POR_ENTREGA): AparaNoTeto {
  const out: Record<string, number> = {}
  let usado = 0
  let cortou = 0
  for (const [slug, n] of Object.entries(quantidades ?? {})) {
    const pedidas = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
    if (!pedidas) continue
    const cabe = Math.max(0, teto - usado)
    const fica = Math.min(pedidas, cabe)
    if (fica > 0) { out[slug] = fica; usado += fica }
    cortou += pedidas - fica
  }
  return { quantidades: out, cortou }
}
