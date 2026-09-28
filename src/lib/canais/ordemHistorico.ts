






function chave(r: { origem_em: string | null; created_at: string }): number {
  const bruto = r.origem_em ?? r.created_at
  const n = Date.parse(bruto)
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY
}

export function ordenarHistorico<T extends { origem_em: string | null; created_at: string }>(rows: T[]): T[] {
  
  
  return rows
    .map((row, i) => ({ row, i, k: chave(row) }))
    .sort((a, b) => (a.k - b.k) || (a.i - b.i))
    .map((d) => d.row)
}
