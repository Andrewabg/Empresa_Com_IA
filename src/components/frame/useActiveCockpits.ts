'use client'


import { useEffect, useRef, useState } from 'react'
import { browserClient, ensureRealtimeAuth } from '@/lib/supabase-browser'

async function fetchActive(): Promise<Set<string> | null> {
  try {
    const res = await fetch('/api/nav/cockpits', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as { active?: unknown }
    if (!Array.isArray(data.active)) return null
    return new Set(data.active.filter((h): h is string => typeof h === 'string'))
  } catch {
    return null
  }
}

export function useActiveCockpits(
  initial: string[] | null,
  enabled = true,
): ReadonlySet<string> | null {
  const [active, setActive] = useState<ReadonlySet<string> | null>(
    initial ? new Set(initial) : null,
  )
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) return 
    const sb = browserClient()
    let unmounted = false
    let ch: ReturnType<typeof sb.channel> | null = null

    
    if (initial === null) {
      fetchActive().then((s) => { if (!unmounted && s) setActive(s) })
    }

    function scheduleRefetch() {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        fetchActive().then((s) => { if (!unmounted && s) setActive(s) })
      }, 400)
    }

    ;(async () => {
      
      
      await ensureRealtimeAuth(sb)
      if (unmounted) return
      ch = sb
        .channel('realtime:roster')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, scheduleRefetch)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'canais' }, scheduleRefetch)
        .subscribe()
    })()

    return () => {
      unmounted = true
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (ch) sb.removeChannel(ch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]) 
  return active
}
