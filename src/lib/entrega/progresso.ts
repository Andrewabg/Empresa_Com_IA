




import { itensParaArte } from '@/lib/estudio/campanha'
import type { PlanoItem } from '@/lib/estudio/types'
import { ehRoteiro, getFormato } from '@/lib/estudio/formatos'
import type { EstadoItem, Entrega, ItemDaEntrega, Progresso, QuemEsta } from './types'


export interface ArteDoItem { criativoId: string; artifactId?: string }


export function itemPedeArte(formato: string, comArte: boolean): boolean {
  return comArte && !ehRoteiro(getFormato(formato))
}


export function estadoDoItem(item: PlanoItem, comArteNaEntrega: boolean): EstadoItem {
  const comArte = itemPedeArte(item.formato, comArteNaEntrega)
  if (item.status === 'falhou') return 'travado'
  if (comArte && item.arte_status === 'falhou') return 'travado'
  if (item.status === 'pendente') return 'na-fila'
  if (item.status === 'produzindo') return 'escrevendo'
  
  if (!comArte) return 'pronto'
  if (item.arte_status === 'pronta') return 'pronto'
  if (item.arte_status === 'produzindo') return 'desenhando'
  return 'texto-pronto'
}


export function quemEsta(estado: EstadoItem): QuemEsta {
  if (estado === 'na-fila' || estado === 'escrevendo') return 'copy'
  if (estado === 'texto-pronto' || estado === 'desenhando') return 'arte'
  return null
}


export function montarEntrega(
  campanha: { id: string; nome: string; bigIdea: string; brief: Record<string, unknown>; plano: PlanoItem[]; createdAt: string },
  artes: Record<number, ArteDoItem> = {},
): Entrega {
  const comArte = entregaPedeArte(campanha.brief)
  const itens: ItemDaEntrega[] = (campanha.plano ?? []).map((it, indice) => {
    const estado = estadoDoItem(it, comArte)
    const arte = artes[indice]
    return {
      indice,
      formato: it.formato,
      formatoNome: getFormato(it.formato)?.nome ?? it.formato,
      canal: it.canal,
      angulo: it.angulo,
      estado,
      quemEsta: quemEsta(estado),
      ...(it.peca_id ? { pecaId: it.peca_id } : {}),
      ...(arte?.criativoId ? { criativoId: arte.criativoId } : {}),
      ...(arte?.artifactId ? { artifactId: arte.artifactId } : {}),
    }
  })
  return { id: campanha.id, nome: campanha.nome, bigIdea: campanha.bigIdea, criadaEm: campanha.createdAt, comArte, itens }
}


export function entregaPedeArte(brief: Record<string, unknown> | undefined | null): boolean {
  const e = brief?.entrega
  if (!e || typeof e !== 'object' || Array.isArray(e)) return false
  return (e as { artes?: unknown }).artes === true
}


export function itensParaArteDaEntrega(plano: PlanoItem[], comArte: boolean): number[] {
  return comArte ? itensParaArte(plano ?? []) : []
}

export function progressoDaEntrega(itens: ItemDaEntrega[]): Progresso {
  const total = itens.length
  const prontos = itens.filter((i) => i.estado === 'pronto').length
  const travados = itens.filter((i) => i.estado === 'travado').length
  const emVoo = total - prontos - travados
  return {
    total,
    prontos,
    travados,
    emVoo,
    porcento: total ? Math.round((prontos / total) * 100) : 0,
    terminou: total > 0 && emVoo === 0,
  }
}


export function fraseDoProgresso(p: Progresso): string {
  if (!p.total) return 'Nada no plano ainda.'
  const base = `${p.prontos} de ${p.total} ${p.total === 1 ? 'pronta' : 'prontas'}`
  if (p.travados) return `${base}, ${p.travados} ${p.travados === 1 ? 'travada' : 'travadas'}.`
  if (p.terminou) return `Tudo pronto: ${p.total} ${p.total === 1 ? 'peça' : 'peças'}.`
  return `${base}.`
}
