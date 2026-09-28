


export const CUSTOM_DIR = 'custom'


export function isCustomPath(path: string): boolean {
  const p = String(path).replace(/^\/+/, '')
  return p === 'custom' || p.startsWith('custom/')
}


export function stripCustomPaths(actual: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [path, sha] of Object.entries(actual)) {
    if (!isCustomPath(path)) out[path] = sha
  }
  return out
}

export interface PublishPlan {
  
  wipe: string[]
  
  copy: string[]
  
  seededCustom: boolean
  
  seedCustomInPlace: boolean
}


export function planPublishEntries(input: { cloneEntries: string[]; extractEntries: string[] }): PublishPlan {
  const cloneHasCustom = input.cloneEntries.includes(CUSTOM_DIR)
  const extractHasCustom = input.extractEntries.includes(CUSTOM_DIR)
  const wipe = input.cloneEntries.filter((e) => e !== '.git' && e !== CUSTOM_DIR).sort()
  const copy = input.extractEntries
    .filter((e) => e !== '.git' && (cloneHasCustom ? e !== CUSTOM_DIR : true))
    .sort()
  const seededCustom = !cloneHasCustom && extractHasCustom
  const seedCustomInPlace = cloneHasCustom && extractHasCustom
  return { wipe, copy, seededCustom, seedCustomInPlace }
}
