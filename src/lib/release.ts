

export function parseVersionTag(tag: string | null | undefined): [number, number, number] | null {
  if (!tag) return null
  const m = tag.trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/)
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
}

export function isNewerVersion(candidate: string | null | undefined, current: string | null | undefined): boolean {
  const a = parseVersionTag(candidate)
  const b = parseVersionTag(current)
  if (!a || !b) return false
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i]
  }
  return false
}

export type UpdateAvailability = {
  current: string | null
  latest: string | null
  updateAvailable: boolean
}

export function getUpdateAvailability(
  stampRef: string | null | undefined,
  latestVersion: string | null | undefined,
): UpdateAvailability {
  
  
  
  const current = stampRef && stampRef.trim() ? stampRef : null
  const latest = latestVersion && latestVersion.trim() ? latestVersion : null
  return { current, latest, updateAvailable: isNewerVersion(latest, current) }
}
