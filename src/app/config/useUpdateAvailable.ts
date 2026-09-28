



'use client'
import { useEffect, useState } from 'react'

type Snapshot = { updateAvailable: boolean; latest: string | null }
const EMPTY: Snapshot = { updateAvailable: false, latest: null }
const TTL_MS = 3 * 60 * 1000

let cache: { at: number; value: Snapshot } | null = null
let inflight: Promise<Snapshot> | null = null



async function fetchSnapshot(): Promise<Snapshot> {
  try {
    const r = await fetch('/api/config/updates')
    if (!r.ok) return EMPTY
    const j = (await r.json()) as { updateAvailable?: boolean; latest?: string | null }
    return { updateAvailable: Boolean(j.updateAvailable), latest: j.latest ?? null }
  } catch {
    return EMPTY
  }
}

export function useUpdateAvailable(): Snapshot {
  const [snap, setSnap] = useState<Snapshot>(() =>
    cache && Date.now() - cache.at < TTL_MS ? cache.value : EMPTY,
  )
  useEffect(() => {
    let alive = true
    if (cache && Date.now() - cache.at < TTL_MS) {
      setSnap(cache.value)
      return
    }
    inflight ??= fetchSnapshot().then((v) => {
      cache = { at: Date.now(), value: v }
      inflight = null
      return v
    })
    void inflight.then((v) => { if (alive) setSnap(v) })
    return () => { alive = false }
  }, [])
  return snap
}
