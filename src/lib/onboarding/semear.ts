
import { slugFato, type FatoEmpresa } from '@/lib/memory/fichaEmpresa'
import { fatoDoTopico } from './fatoDoTopico'
import { pisoProfundidade } from './profundidade'
import type { Slot } from './types'


function valoresDoOperador(fatos: FatoEmpresa[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const f of fatos ?? []) {
    if (f?.fonte !== 'operador') continue
    const valor = (f.valor ?? '').trim()
    const rotulo = (f.rotulo ?? '').trim()
    if (!valor || !rotulo) continue
    if (!m.has(slugFato(rotulo))) m.set(slugFato(rotulo), valor)
  }
  return m
}


export function semearComFicha(slots: Slot[], fatos: FatoEmpresa[]): Slot[] {
  const porSlug = valoresDoOperador(fatos)
  if (porSlug.size === 0) return slots
  return slots.map((s) => {
    if (s.status !== 'vazio') return s
    const mapa = fatoDoTopico(s.id)
    if (!mapa) return s
    const valor = porSlug.get(slugFato(mapa.rotulo))
    if (!valor) return s
    return { ...s, status: 'coberto' as const, valor, profundidade: pisoProfundidade(valor) }
  })
}
