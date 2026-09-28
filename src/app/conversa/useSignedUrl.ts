'use client'
import { useCallback, useEffect, useRef, useState } from 'react'


const cache = new Map<string, string>()


class FalhaAssinatura extends Error {
  constructor(readonly indisponivel: boolean) {
    super('signed url falhou')
  }
}


export function useSignedUrl(artifactId: string): { url: string | null; error: boolean; indisponivel: boolean; reload: () => void } {
  const [url, setUrl] = useState<string | null>(() => cache.get(artifactId) ?? null)
  const [error, setError] = useState(false)
  const [indisponivel, setIndisponivel] = useState(false)
  const [nonce, setNonce] = useState(0)
  const retriesRef = useRef(0)

  
  useEffect(() => { retriesRef.current = 0 }, [artifactId])

  useEffect(() => {
    const cached = cache.get(artifactId)
    if (cached) { setUrl(cached); setError(false); setIndisponivel(false); return }
    let cancelled = false
    setUrl(null); setError(false); setIndisponivel(false)
    fetch(`/api/artifacts/${artifactId}/url`)
      .then((r) => {
        if (!r.ok) throw new FalhaAssinatura(r.status === 404)
        return r.json() as Promise<{ url?: string }>
      })
      .then((j: { url?: string }) => {
        if (cancelled) return
        if (j.url) { cache.set(artifactId, j.url); setUrl(j.url) } else setError(true)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(true)
        if (e instanceof FalhaAssinatura && e.indisponivel) setIndisponivel(true)
      })
    return () => { cancelled = true }
  }, [artifactId, nonce])

  
  
  
  const reload = useCallback(() => {
    if (indisponivel) return
    if (retriesRef.current >= 1) { setError(true); return }
    retriesRef.current += 1
    cache.delete(artifactId)
    setUrl(null)
    setNonce((n) => n + 1)
  }, [artifactId, indisponivel])

  return { url, error, indisponivel, reload }
}
