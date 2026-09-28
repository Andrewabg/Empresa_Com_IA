
import { NAV_BUNDLE_TAG } from '@/lib/brain-nav'
import { BRAND_ASSET_REVISION } from '@/lib/brand'
import { CHART_SCHEMA_REVISION } from '@/lib/chart'

const REVISIONS = [NAV_BUNDLE_TAG, BRAND_ASSET_REVISION, CHART_SCHEMA_REVISION]


export function presentationRevisionCount(): number {
  return REVISIONS.filter((v) => typeof v === 'string' && v.length > 0).length
}
