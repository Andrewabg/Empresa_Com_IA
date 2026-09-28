
import { skillsWorkspaceReady } from './workspace'

export interface SkillCatalogEntry {
  slug: string
  name: string
  description: string
  origem: 'starter' | 'buyer'
}


export async function listSkillCatalog(): Promise<SkillCatalogEntry[]> {
  const ws = await skillsWorkspaceReady()
  const metas = await ws.skills!.list()
  const bySlug = new Map<string, SkillCatalogEntry>()
  for (const m of metas) {
    const origem: 'starter' | 'buyer' = m.path?.startsWith('/buyer') ? 'buyer' : 'starter'
    const existing = bySlug.get(m.name)
    
    if (!existing || (existing.origem === 'starter' && origem === 'buyer')) {
      bySlug.set(m.name, { slug: m.name, name: m.name, description: m.description ?? '', origem })
    }
  }
  return [...bySlug.values()]
}
