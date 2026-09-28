


import raw from './awave-manifest.json'
import { parseManifest, type Manifest } from '@/lib/manifest'
export function getManifest(): Manifest | null {
  return parseManifest(raw)
}
