
const CENAS_BARE = new Set(['onboarding', 'login', 'convite'])




export function ehCenaBare(segmento: string | null): boolean {
  return segmento !== null && CENAS_BARE.has(segmento)
}
