




import { getFormato, normalizarSlugDeFormato } from '@/lib/estudio/formatos'
import { MAX_POR_FORMATO } from '@/lib/estudio/quantidades'
import { aparaNoTeto, totalDePecas } from './estimativa'
import type { PedidoDeEntrega } from './types'

const texto = (v: unknown, max = 600): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export interface PedidoNormalizado { pedido: PedidoDeEntrega; cortouPeloTeto: number }


export function normalizarPedido(cru: unknown): PedidoNormalizado {
  const o = (cru && typeof cru === 'object' ? cru : {}) as Record<string, unknown>
  const quantidadesCruas = (o.quantidades && typeof o.quantidades === 'object' && !Array.isArray(o.quantidades)
    ? o.quantidades
    : {}) as Record<string, unknown>

  const limpas: Record<string, number> = {}
  for (const [chave, valor] of Object.entries(quantidadesCruas)) {
    const slug = normalizarSlugDeFormato(chave)
    if (!getFormato(slug)) continue
    const n = Number(valor)
    if (!Number.isFinite(n) || n <= 0) continue
    limpas[slug] = Math.min(MAX_POR_FORMATO, Math.floor(n))
  }

  const { quantidades, cortou } = aparaNoTeto(limpas)
  return {
    pedido: {
      objetivo: texto(o.objetivo),
      oferta: texto(o.oferta),
      publico: texto(o.publico),
      quantidades,
      comArte: o.comArte === true,
    },
    cortouPeloTeto: cortou,
  }
}


export function pedidoEstaCompleto(p: PedidoDeEntrega): boolean {
  return !!p.objetivo && totalDePecas(p.quantidades) > 0
}


export function briefDoPedido(p: PedidoDeEntrega): Record<string, unknown> {
  return {
    ...(p.objetivo ? { objetivo: p.objetivo } : {}),
    ...(p.oferta ? { oferta: p.oferta } : {}),
    ...(p.publico ? { publico: p.publico } : {}),
    quantidades: p.quantidades,
    entrega: { artes: p.comArte },
  }
}


export function resumoDoPedido(p: PedidoDeEntrega): string {
  const partes = Object.entries(p.quantidades).map(([slug, n]) => `${n} ${getFormato(slug)?.nome ?? slug}`)
  if (!partes.length) return 'Nenhuma peça escolhida ainda.'
  const lista = partes.length === 1 ? partes[0]! : `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`
  return p.comArte ? `${lista}, com arte.` : `${lista}, só o texto.`
}
