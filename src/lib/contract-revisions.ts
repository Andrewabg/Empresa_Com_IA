
import { WIRE_PROTOCOL_REVISION } from '@/server/agent/wireTypes'
import { ARTIFACT_SCHEMA_REVISION } from '@/lib/artifacts'
import { CITATION_DISCLOSURE_REVISION } from '@/lib/citations'

const REVISIONS = [
  WIRE_PROTOCOL_REVISION,
  ARTIFACT_SCHEMA_REVISION,
  CITATION_DISCLOSURE_REVISION,
]


export function contractRevisionCount(): number {
  return REVISIONS.filter((v) => typeof v === 'string' && v.length > 0).length
}
