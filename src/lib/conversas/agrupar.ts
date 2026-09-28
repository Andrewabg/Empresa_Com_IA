
export interface GrupoTempo<T> {
  label: string
  itens: T[]
}

const MS_DIA = 86_400_000

export function agruparPorTempo<T extends { updated_at: string }>(
  itens: T[],
  nowIso: string,
): GrupoTempo<T>[] {
  const now = Date.parse(nowIso)
  const grupos: GrupoTempo<T>[] = [
    { label: 'Hoje', itens: [] },
    { label: 'Ontem', itens: [] },
    { label: 'Últimos 7 dias', itens: [] },
    { label: 'Mais antigas', itens: [] },
  ]
  const diaDe = (ms: number) => Math.floor(ms / MS_DIA) 
  const hoje = Number.isNaN(now) ? 0 : diaDe(now)
  for (const it of itens) {
    const t = Date.parse(it.updated_at)
    if (Number.isNaN(t)) {
      grupos[3].itens.push(it)
      continue
    }
    const delta = hoje - diaDe(t)
    if (delta <= 0) grupos[0].itens.push(it)
    else if (delta === 1) grupos[1].itens.push(it)
    else if (delta <= 7) grupos[2].itens.push(it)
    else grupos[3].itens.push(it)
  }
  return grupos.filter((g) => g.itens.length > 0)
}
