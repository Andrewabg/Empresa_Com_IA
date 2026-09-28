

import type { ConsultaValida, OpDeFiltro } from './tipos'

const SEGMENTO: Record<ConsultaValida['aresta'], string | null> = {
  insights: 'insights', campanhas: 'campaigns', conjuntos: 'adsets', anuncios: 'ads', criativos: 'adcreatives', audiencias: 'customaudiences', detalhes: null,
}
const OPERADOR: Record<OpDeFiltro, string> = { igual: 'EQUAL', contem: 'CONTAIN', maior: 'GREATER_THAN', menor: 'LESS_THAN', em: 'IN' }

const INCREMENTO: Record<Exclude<ConsultaValida['incremento'], 'total'>, string> = { dia: '1', semana: '7', mes: 'monthly' }

export function montarPath(c: ConsultaValida, contaId: string | null, after?: string): string {
  const no = c.objeto === 'conta' ? contaId : c.objeto
  if (!no) throw new Error('objeto conta sem contaId')
  const q = new URLSearchParams()
  q.set('fields', c.campos.join(','))
  if (c.aresta === 'insights') {
    if (c.levelGraph) q.set('level', c.levelGraph)
    if (c.periodo && 'preset' in c.periodo) q.set('date_preset', c.periodo.preset)
    if (c.periodo && 'since' in c.periodo) q.set('time_range', JSON.stringify({ since: c.periodo.since, until: c.periodo.until }))
    if (c.incremento !== 'total') q.set('time_increment', INCREMENTO[c.incremento])
    if (c.breakdowns.length) q.set('breakdowns', c.breakdowns.join(','))
    if (c.ordenar) q.set('sort', `${c.ordenar.campo}_${c.ordenar.direcao === 'asc' ? 'ascending' : 'descending'}`)
  }
  if (c.filtros.length) q.set('filtering', JSON.stringify(c.filtros.map((f) => ({ field: f.campo, operator: OPERADOR[f.op], value: f.valor }))))
  if (c.aresta !== 'detalhes') q.set('limit', String(c.limite))
  if (after) q.set('after', after)
  const segmento = SEGMENTO[c.aresta]
  return `/${no}${segmento ? `/${segmento}` : ''}?${q.toString()}`
}
