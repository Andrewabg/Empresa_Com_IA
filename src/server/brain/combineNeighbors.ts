


import type { NeighborProvider } from './graphExpand'

export function combineNeighborProviders(...providers: NeighborProvider[]): NeighborProvider {
  return async (anchorIds) => {
    const settled = await Promise.all(
      providers.map((p) =>
        Promise.resolve().then(() => p(anchorIds)).catch((e) => {
          console.warn('[combineNeighbors] provider fail-open:', e)
          return [] as Awaited<ReturnType<NeighborProvider>>
        }),
      ),
    )
    const byId = new Map<string, { note: (typeof settled)[number][number]['note']; anchorIds: Set<string> }>()
    const order: string[] = []
    for (const list of settled) {
      for (const item of list ?? []) {
        const id = item?.note?.id
        if (!id) continue
        let entry = byId.get(id)
        if (!entry) { entry = { note: item.note, anchorIds: new Set() }; byId.set(id, entry); order.push(id) }
        for (const a of item.anchorIds ?? []) entry.anchorIds.add(a)
      }
    }
    return order.map((id) => { const e = byId.get(id)!; return { note: e.note, anchorIds: [...e.anchorIds] } })
  }
}
