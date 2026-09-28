

export function ultimaVersaoPorPeca<T extends { peca_id: string; n: number }>(rows: T[]): Map<string, T> {
  const map = new Map<string, T>()
  for (const r of rows) {
    const cur = map.get(r.peca_id)
    if (!cur || r.n > cur.n) map.set(r.peca_id, r)
  }
  return map
}
