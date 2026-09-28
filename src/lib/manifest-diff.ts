


export type DivergenceStatus = 'limpo' | 'divergente' | 'desconhecido'
export interface DivergenceReport {
  status: DivergenceStatus
  modified: string[]
  added: string[]
  removed: string[]
}

export function diffManifest(
  canonical: Record<string, string>,
  actual: Record<string, string>,
  excludes: readonly string[] = [],
): DivergenceReport {
  const ex = new Set(excludes)
  const modified: string[] = []
  const removed: string[] = []
  for (const [path, sha] of Object.entries(canonical)) {
    if (ex.has(path)) continue
    if (!(path in actual)) removed.push(path)
    else if (actual[path] !== sha) modified.push(path)
  }
  const added: string[] = []
  for (const path of Object.keys(actual)) {
    if (ex.has(path) || path in canonical) continue
    added.push(path)
  }
  modified.sort(); added.sort(); removed.sort()
  const status: DivergenceStatus =
    modified.length + added.length + removed.length > 0 ? 'divergente' : 'limpo'
  return { status, modified, added, removed }
}
