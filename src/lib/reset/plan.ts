import type { CategoriaId, ResetFlags, ResetOp } from './tipos'
import {
  TABELAS_POR_CATEGORIA,
  CHAVES_POR_CATEGORIA,
  ORDEM_CATEGORIAS,
} from './categorias'






export interface ArestaFk {
  parent: string
  column: string
  onDelete: 'cascade' | 'set null' | 'no action' | 'restrict'
}


export interface NoGrafo {
  table: string
  refs: ArestaFk[]
}


export type GrafoFk = NoGrafo[]


export interface PlanoReset {
  ops: ResetOp[]
  categoriasEfetivas: CategoriaId[]
}






function eBloqueante(onDelete: ArestaFk['onDelete']): boolean {
  return onDelete === 'no action' || onDelete === 'restrict'
}






function toposortBloqueante(
  escopo: Set<string>,
  grafo: GrafoFk,
): string[] {
  
  
  
  
  const indegree = new Map<string, number>()
  const dependentes = new Map<string, string[]>() 

  for (const t of escopo) {
    if (!indegree.has(t)) indegree.set(t, 0)
    if (!dependentes.has(t)) dependentes.set(t, [])
  }

  for (const no of grafo) {
    if (!escopo.has(no.table)) continue
    for (const ref of no.refs) {
      if (!escopo.has(ref.parent)) continue
      if (!eBloqueante(ref.onDelete)) continue
      
      
      
      
      
      indegree.set(ref.parent, (indegree.get(ref.parent) ?? 0) + 1)
      
      const lista = dependentes.get(no.table) ?? []
      lista.push(ref.parent)
      dependentes.set(no.table, lista)
    }
  }

  
  
  const fila: string[] = []
  const escopoArray = [...escopo] 

  for (const t of escopoArray) {
    if ((indegree.get(t) ?? 0) === 0) fila.push(t)
  }

  const resultado: string[] = []

  while (fila.length > 0) {
    const atual = fila.shift()!
    resultado.push(atual)
    
    for (const pai of (dependentes.get(atual) ?? [])) {
      const novo = (indegree.get(pai) ?? 0) - 1
      indegree.set(pai, novo)
      if (novo === 0) fila.push(pai)
    }
  }

  
  for (const t of escopoArray) {
    if (!resultado.includes(t)) resultado.push(t)
  }

  return resultado
}






export function planDeletion(grafo: GrafoFk, flags: ResetFlags): PlanoReset {
  
  const categoriasEfetivas: CategoriaId[] =
    flags.categorias.includes('identidade')
      ? [...ORDEM_CATEGORIAS]
      : [...flags.categorias]

  
  const raizes = new Set<string>()
  for (const cat of categoriasEfetivas) {
    for (const t of TABELAS_POR_CATEGORIA[cat] ?? []) {
      raizes.add(t)
    }
  }

  
  
  
  const escopo = new Set<string>(raizes)
  let mudou = true
  while (mudou) {
    mudou = false
    for (const no of grafo) {
      
      for (const ref of no.refs) {
        if (!escopo.has(ref.parent)) continue
        if (!eBloqueante(ref.onDelete)) continue
        
        if (!escopo.has(no.table)) {
          escopo.add(no.table)
          mudou = true
        }
      }
    }
  }

  
  
  
  const scopeParaOp = new Set<string>()
  for (const t of escopo) {
    if (raizes.has(t)) {
      scopeParaOp.add(t)
      continue
    }
    
    
    const no = grafo.find(n => n.table === t)
    if (!no) {
      
      scopeParaOp.add(t)
      continue
    }
    const temBloqueante = no.refs.some(
      r => escopo.has(r.parent) && eBloqueante(r.onDelete),
    )
    if (temBloqueante) {
      scopeParaOp.add(t)
    }
    
  }

  
  const ordenadas = toposortBloqueante(scopeParaOp, grafo)

  
  const opsDelete: ResetOp[] = []

  
  
  const fkColsParaAgentes = new Map<string, string[]>()
  if (categoriasEfetivas.includes('agentes')) {
    for (const no of grafo) {
      const colsBloqueantes: string[] = []
      for (const ref of no.refs) {
        if (ref.parent === 'agents' && eBloqueante(ref.onDelete)) {
          colsBloqueantes.push(ref.column)
        }
      }
      if (colsBloqueantes.length > 0) {
        fkColsParaAgentes.set(no.table, colsBloqueantes)
      }
    }
  }

  for (const tabela of ordenadas) {
    const op = construirOpDelete(tabela, categoriasEfetivas, fkColsParaAgentes, raizes)
    opsDelete.push(op)
  }

  
  const opsEspeciais: ResetOp[] = []

  if (categoriasEfetivas.includes('cerebro')) {
    opsEspeciais.push({ op: 'update_sync_state' })
  }

  
  
  
  
  
  const chavesSettings = new Set<string>()
  for (const cat of categoriasEfetivas) {
    for (const chave of CHAVES_POR_CATEGORIA[cat] ?? []) {
      chavesSettings.add(chave)
    }
  }
  if (chavesSettings.size > 0) {
    opsEspeciais.push({
      op: 'delete_settings_keys',
      keys: [...chavesSettings],
    })
  }

  return {
    ops: [...opsDelete, ...opsEspeciais],
    categoriasEfetivas,
  }
}





function construirOpDelete(
  tabela: string,
  categoriasEfetivas: CategoriaId[],
  fkColsParaAgentes: Map<string, string[]>,
  raizesEfetivas: Set<string>,
): ResetOp {
  
  
  if (tabela === 'agents' && categoriasEfetivas.includes('agentes')) {
    return { op: 'delete', table: 'agents', keep: 'primary_coo' }
  }

  
  
  
  
  if (
    categoriasEfetivas.includes('agentes') &&
    fkColsParaAgentes.has(tabela) &&
    !raizesEfetivas.has(tabela)
  ) {
    return {
      op: 'delete',
      table: tabela,
      keep: 'nao_kept_agente',
      fk_cols: fkColsParaAgentes.get(tabela)!,
    }
  }

  
  if (tabela === 'equipe_membros' && categoriasEfetivas.includes('equipe')) {
    return { op: 'delete', table: tabela, keep: 'dono' }
  }

  
  return { op: 'delete', table: tabela }
}
