
import type { ContratoView, Parecer } from '@/lib/juridico/types'

export function contagemSemaforo(p?: Parecer): { critico: number; atencao: number; ok: number } {
  const c = { critico: 0, atencao: 0, ok: 0 }
  for (const cl of p?.clausulas ?? []) c[cl.semaforo]++
  return c
}

export function resumoParecer(p?: Parecer): string {
  if (!p) return ''
  const c = contagemSemaforo(p)
  const partes: string[] = []
  if (c.critico) partes.push(`${c.critico} crítico${c.critico > 1 ? 's' : ''}`)
  if (c.atencao) partes.push(`${c.atencao} atenção`)
  if (c.ok) partes.push(`${c.ok} ok`)
  return partes.join(' · ')
}

export type GrupoMesa = 'producao' | 'analises' | 'finalizados' | 'modelos' | 'arquivados'


export function grupoDaMesa(c: ContratoView): GrupoMesa {
  if (c.kind === 'modelo' && c.status !== 'arquivado') return 'modelos'
  if (c.status === 'arquivado') return 'arquivados'
  if (c.status === 'rascunho' || c.status === 'em_revisao') return 'producao'
  if (c.status === 'recebido' || c.status === 'analisado') return 'analises'
  return 'finalizados'
}

export function agruparMesa(cs: ContratoView[]): Record<GrupoMesa, ContratoView[]> {
  const g: Record<GrupoMesa, ContratoView[]> = { producao: [], analises: [], finalizados: [], modelos: [], arquivados: [] }
  for (const c of cs) g[grupoDaMesa(c)].push(c)
  return g
}
