

export type Manifest = { ref: string; algo: string; files: Record<string, string> }


export const MANIFEST_EXCLUDES = [
  'src/server/awave-stamp.json',
  'src/server/awave-manifest.json',
] as const

export function parseManifest(raw: unknown): Manifest | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.ref !== 'string' || typeof o.algo !== 'string') return null
  if (!o.files || typeof o.files !== 'object') return null
  const files: Record<string, string> = {}
  for (const [k, v] of Object.entries(o.files as Record<string, unknown>)) {
    if (typeof v === 'string') files[k] = v
  }
  return { ref: o.ref, algo: o.algo, files }
}
