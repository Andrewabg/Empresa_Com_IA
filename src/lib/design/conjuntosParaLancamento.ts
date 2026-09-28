






export interface ConjuntoOpcao { id: string; nome: string }


export function conjuntosParaLancamento(
  snapshots: { entity_id: string; entity_name: string | null }[],
): ConjuntoOpcao[] {
  const out: ConjuntoOpcao[] = []
  const vistos = new Set<string>()
  for (const s of snapshots) {
    const id = s.entity_id?.trim()
    if (!id || vistos.has(id)) continue
    vistos.add(id)
    out.push({ id, nome: s.entity_name?.trim() || id })
  }
  return out
}
