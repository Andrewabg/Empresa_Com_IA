
import { serverDb } from '@/server/supabase'
import type { GrafoFk, ArestaFk } from '@/lib/reset/plan'


interface LinhaFk {
  child: string
  child_col: string
  parent: string
  on_delete: string
}


function normalizarNome(bruto: string): string {
  let nome = bruto.trim()
  
  
  
  if (nome.startsWith('public.')) nome = nome.slice('public.'.length)
  nome = nome.replace(/"/g, '')
  return nome
}


function normalizarOnDelete(bruto: string): ArestaFk['onDelete'] {
  switch (bruto) {
    case 'cascade':
      return 'cascade'
    case 'set null':
      return 'set null'
    case 'restrict':
      return 'restrict'
    case 'no action':
    default:
      return 'no action'
  }
}


export async function carregarGrafoFk(): Promise<GrafoFk> {
  const { data, error } = await serverDb().rpc('reset_fk_graph')
  if (error) {
    throw new Error(`[carregarGrafoFk] reset_fk_graph falhou: ${error.message}`)
  }
  const linhas = (data ?? []) as LinhaFk[]

  const porFilho = new Map<string, ArestaFk[]>()
  for (const linha of linhas) {
    const child = normalizarNome(linha.child)
    const parent = normalizarNome(linha.parent)
    const column = linha.child_col
    const onDelete = normalizarOnDelete(linha.on_delete)
    const refs = porFilho.get(child) ?? []
    refs.push({ parent, column, onDelete })
    porFilho.set(child, refs)
  }

  return [...porFilho.entries()].map(([table, refs]) => ({ table, refs }))
}
