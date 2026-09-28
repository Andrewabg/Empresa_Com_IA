








export type CategoriaMeta = 'marketing' | 'utility' | 'authentication' | 'service' | 'desconhecida'

const CATEGORIAS: CategoriaMeta[] = ['marketing', 'utility', 'authentication', 'service']


export const CATEGORIA_LABEL: Record<CategoriaMeta, string> = {
  marketing: 'marketing',
  utility: 'utilidade',
  authentication: 'autenticação',
  service: 'atendimento',
  desconhecida: 'não classificada',
}

export interface Cobranca { billable: boolean; categoria: CategoriaMeta }


export function lerCobranca(pricing: unknown): Cobranca | null {
  if (!pricing || typeof pricing !== 'object') return null
  const p = pricing as { billable?: unknown; categoria?: unknown; category?: unknown }
  if (typeof p.billable !== 'boolean') return null
  const bruta = typeof p.categoria === 'string' ? p.categoria : typeof p.category === 'string' ? p.category : ''
  return { billable: p.billable, categoria: normalizarCategoria(bruta) }
}


export function normalizarCategoria(bruta: string): CategoriaMeta {
  const s = bruta.trim().toLowerCase()
  return (CATEGORIAS as string[]).includes(s) ? (s as CategoriaMeta) : 'desconhecida'
}

export interface ContagemPorCategoria { categoria: CategoriaMeta; mensagens: number }


export function somarCobrancas(eventos: Cobranca[]): ContagemPorCategoria[] {
  const mapa = new Map<CategoriaMeta, number>()
  for (const e of eventos) {
    if (!e.billable) continue
    mapa.set(e.categoria, (mapa.get(e.categoria) ?? 0) + 1)
  }
  return [...mapa.entries()]
    .map(([categoria, mensagens]) => ({ categoria, mensagens }))
    .sort((a, b) => b.mensagens - a.mensagens || a.categoria.localeCompare(b.categoria))
}


export const PREFIXO_MODELO = 'whatsapp:'
export function modeloDaCobranca(c: Cobranca): string {
  return `${PREFIXO_MODELO}${c.categoria}`
}

export function categoriaDoModelo(model: string): CategoriaMeta | null {
  if (!model.startsWith(PREFIXO_MODELO)) return null
  return normalizarCategoria(model.slice(PREFIXO_MODELO.length))
}


export function resumoCobranca(itens: ContagemPorCategoria[]): string {
  const total = itens.reduce((s, i) => s + i.mensagens, 0)
  if (total === 0) return 'Nenhuma mensagem cobrada pela Meta no período.'
  const detalhe = itens.map((i) => `${CATEGORIA_LABEL[i.categoria]} ${i.mensagens}`).join(', ')
  return `${total} ${total === 1 ? 'mensagem cobrada' : 'mensagens cobradas'} pela Meta (${detalhe}).`
}
