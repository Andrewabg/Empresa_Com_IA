




import type { ToolkitCardData } from '@/server/agent/wireTypes'


export function upsertToolkit(list: ToolkitCardData[], card: ToolkitCardData): ToolkitCardData[] {
  const i = list.findIndex((t) => t.slug === card.slug)
  if (i === -1) return [...list, card]
  const next = [...list]
  next[i] = { ...next[i], ...card }
  return next
}
