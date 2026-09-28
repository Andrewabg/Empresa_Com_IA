

export type TipoBase = 'fato' | 'playbook'

export interface EntradaBaseEditavel {
  id?: string            
  titulo: string
  conteudo: string
  tipo: TipoBase
  enabled: boolean
  editavel: boolean      
}

export interface BaseOps {
  add: { titulo: string; conteudo: string; tipo: TipoBase }[]
  update: { id: string; titulo: string; conteudo: string; tipo: TipoBase }[]
  toggle: { id: string; enabled: boolean }[]
  remove: string[]
}

export function diffBaseOps(vivas: EntradaBaseEditavel[], editadas: EntradaBaseEditavel[]): BaseOps {
  const ops: BaseOps = { add: [], update: [], toggle: [], remove: [] }
  const vivasPorId = new Map(vivas.filter((e) => e.id).map((e) => [e.id!, e]))
  const idsEditados = new Set(editadas.filter((e) => e.id).map((e) => e.id!))

  for (const e of editadas) {
    if (!e.id) { ops.add.push({ titulo: e.titulo, conteudo: e.conteudo, tipo: e.tipo }); continue }
    const antiga = vivasPorId.get(e.id)
    if (!antiga || !antiga.editavel) continue 
    if (e.titulo !== antiga.titulo || e.conteudo !== antiga.conteudo || e.tipo !== antiga.tipo) {
      ops.update.push({ id: e.id, titulo: e.titulo, conteudo: e.conteudo, tipo: e.tipo })
    }
    if (e.enabled !== antiga.enabled) ops.toggle.push({ id: e.id, enabled: e.enabled })
  }
  for (const v of vivas) {
    if (v.id && v.editavel && !idsEditados.has(v.id)) ops.remove.push(v.id)
  }
  return ops
}
