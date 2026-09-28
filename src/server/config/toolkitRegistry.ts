
import { getCatalog } from '@/server/hub/catalog'

export type ToolkitMeta = { slug: string; name: string; category?: string; icon?: string }

let snapshot: ToolkitMeta[] = []


export function setToolkitSnapshot(entries: ToolkitMeta[]): void {
  snapshot = entries
}


export async function hydrateToolkitRegistry(): Promise<void> {
  try {
    const entries = await getCatalog(['toolkit'])
    snapshot = entries.map((e) => {
      const d = (e.definition ?? {}) as Partial<ToolkitMeta>
      return {
        slug: d.slug ?? e.slug,
        name: d.name ?? titleCase(e.slug),
        category: d.category ?? e.category ?? undefined,
        icon: d.icon,
      }
    })
  } catch {
    
  }
}


export function meta(slug: string): ToolkitMeta | null {
  const alvo = slug.toLowerCase()
  return snapshot.find((t) => t.slug.toLowerCase() === alvo) ?? null
}


export function displayName(slug: string): string {
  return meta(slug)?.name ?? titleCase(slug)
}


export function list(): ToolkitMeta[] {
  return snapshot
}


function titleCase(slug: string): string {
  return slug
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
