'use client'



import { useEffect, useState } from 'react'

const cache = new Map<string, { url: string; at: number }>()
const TTL_MS = 3_300_000 
const pending = new Map<string, Promise<string | null>>()


async function requestUrl(artifactId: string): Promise<string | null> {
  let p = pending.get(artifactId)
  if (!p) {
    p = fetch(`/api/artifacts/${artifactId}/url`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { url?: string } | null) => {
        const url = j?.url ?? null
        if (url) cache.set(artifactId, { url, at: Date.now() })
        return url
      })
      .catch(() => null)
      .finally(() => pending.delete(artifactId))
    pending.set(artifactId, p)
  }
  return p
}


async function fetchUrl(artifactId: string): Promise<string | null> {
  const hit = cache.get(artifactId)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.url
  return requestUrl(artifactId)
}


export function seedArtifactUrls(urls: Record<string, string>): void {
  const now = Date.now()
  for (const [id, url] of Object.entries(urls)) cache.set(id, { url, at: now })
}


export function readCachedArtifactUrl(artifactId: string): string | null {
  const hit = cache.get(artifactId)
  return hit && Date.now() - hit.at < TTL_MS ? hit.url : null
}


export function useArtifactUrl(artifactId: string | null): string | null {
  const [url, setUrl] = useState<string | null>(() => {
    if (!artifactId) return null
    const hit = cache.get(artifactId)
    return hit && Date.now() - hit.at < TTL_MS ? hit.url : null
  })
  useEffect(() => {
    let alive = true
    if (!artifactId) { setUrl(null); return }
    
    const hit = cache.get(artifactId)
    if (hit && Date.now() - hit.at < TTL_MS) { setUrl(hit.url); return }
    setUrl(null)
    void fetchUrl(artifactId).then((u) => { if (alive) setUrl(u) })
    return () => { alive = false }
  }, [artifactId])
  return url
}


export async function baixarArtifact(artifactId: string, filename: string): Promise<boolean> {
  
  
  const url = await requestUrl(artifactId)
  if (!url) return false
  const res = await fetch(url)
  if (!res.ok) {
    console.error('[baixarArtifact] URL inválida/expirada:', res.status)
    return false
  }
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
  return true
}
