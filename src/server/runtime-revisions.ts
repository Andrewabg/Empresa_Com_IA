
import { WIZARD_SCHEMA_REVISION } from '@/lib/config-wizard'
import { CONFIG_SECTIONS_REVISION } from '@/lib/config-sections'

const REVISIONS = [WIZARD_SCHEMA_REVISION, CONFIG_SECTIONS_REVISION]


export function runtimeRevisionCount(): number {
  return REVISIONS.filter((v) => typeof v === 'string' && v.length > 0).length
}
