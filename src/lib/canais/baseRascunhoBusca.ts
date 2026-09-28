











import type { BaseOps } from './baseOps'
import { tokenizar, sobreposicao } from '@/lib/text'
export { tokenizar, sobreposicao } from '@/lib/text'

export interface ResultadoBase {
  id: string
  titulo: string
  conteudo: string
  tipo: 'fato' | 'playbook'
  score: number
  similarity?: number | null
}


export interface EntradaConhecida {
  id: string
  titulo: string
  conteudo: string
  tipo: 'fato' | 'playbook'
}


export function aplicarRascunhoNaBusca(
  publicados: ResultadoBase[],
  ops: BaseOps | undefined | null,
  conhecidasPorId: Map<string, EntradaConhecida>,
  pergunta: string,
  tipo: 'fato' | 'playbook' | null,
  k: number,
): ResultadoBase[] {
  if (!ops) return publicados.slice(0, k)

  const bloqueados = new Set<string>([...(ops.remove ?? [])])
  for (const t of ops.toggle ?? []) if (!t.enabled) bloqueados.add(t.id)

  const atualizados = new Map<string, EntradaConhecida>()
  for (const u of ops.update ?? []) atualizados.set(u.id, { id: u.id, titulo: u.titulo, conteudo: u.conteudo, tipo: u.tipo })

  
  const base = publicados.filter((r) => !bloqueados.has(r.id) && !atualizados.has(r.id))

  
  const candidatos: EntradaConhecida[] = []
  ;(ops.add ?? []).forEach((a, i) =>
    candidatos.push({ id: `rascunho-add-${i}`, titulo: a.titulo, conteudo: a.conteudo, tipo: a.tipo }),
  )
  for (const u of atualizados.values()) candidatos.push(u)
  for (const t of ops.toggle ?? []) {
    if (!t.enabled) continue
    const e = conhecidasPorId.get(t.id)
    if (e) candidatos.push(e)
  }

  
  const injetados: ResultadoBase[] = []
  for (const c of candidatos) {
    if (tipo && c.tipo !== tipo) continue
    const overlap = sobreposicao(pergunta, `${c.titulo} ${c.conteudo}`)
    if (overlap > 0) injetados.push({ id: c.id, titulo: c.titulo, conteudo: c.conteudo, tipo: c.tipo, score: 1 + overlap, similarity: null })
  }

  
  const seen = new Set<string>()
  const out: ResultadoBase[] = []
  for (const r of [...injetados, ...base]) {
    if (seen.has(r.id)) continue
    seen.add(r.id)
    out.push(r)
    if (out.length >= k) break
  }
  return out
}
