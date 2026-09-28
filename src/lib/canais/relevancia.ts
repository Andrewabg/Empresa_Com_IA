
export function filtrarPorRelevancia<T extends { tipo: 'fato' | 'playbook'; similarity?: number | null }>(res: T[], cutoff: number): T[] {
  return res.filter((r) => r.tipo === 'playbook' || r.similarity == null || r.similarity >= cutoff)
}
