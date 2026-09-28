











import { applyBriefPatch, type HiringBrief } from './brief'

export interface RefreshMergeResult {
  
  brief: HiringBrief
  
  slugsAEmitir: string[]
}


export function mergeRefreshPromocoes(
  refreshed: HiringBrief,
  briefLidoInicio: HiringBrief,
  freshBrief: HiringBrief | null,
): RefreshMergeResult {
  
  const promovidos = refreshed.ferramentas.filter((f) => {
    const antes = briefLidoInicio.ferramentas.find((x) => x.slug === f.slug)
    return f.status === 'conectada' && antes?.status !== 'conectada'
  })

  
  
  let merged = freshBrief ?? refreshed
  for (const p of promovidos) {
    merged = applyBriefPatch(merged, { ferramenta: { ...p, status: 'conectada' } })
  }

  
  const slugsAEmitir: string[] = []
  for (const p of promovidos) {
    const efetivo = merged.ferramentas.find((x) => x.slug === p.slug)
    if (efetivo?.status === 'conectada') slugsAEmitir.push(efetivo.slug)
  }

  return { brief: merged, slugsAEmitir }
}
