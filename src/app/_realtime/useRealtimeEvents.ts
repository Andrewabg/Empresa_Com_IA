'use client'



import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { browserClient, ensureRealtimeAuth } from '@/lib/supabase-browser'
import { bus } from '@/mock/bus'
import type { LiveEvent } from '@/mock/types'
import type { EventRow } from '@/data/events'




const CHANNEL = 'realtime:events'




let _hookActive = false




export function rowToLiveEvent(row: EventRow): LiveEvent {
  return {
    id: row.id,
    type: row.type,
    label: row.label,
    at: Date.parse(row.created_at),
    agent: row.agent,
  }
}




export function useRealtimeEvents(): { online: boolean } {
  const [online, setOnline] = useState(false)

  
  const channelRef = useRef<RealtimeChannel | null>(null)

  
  
  const subscribingRef = useRef(false)

  
  
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  
  const attemptRef = useRef(0)

  useEffect(() => {
    const sb = browserClient()
    let unmounted = false

    
    if (_hookActive) {
      console.warn(
        '[useRealtimeEvents] já montado em outro lugar — deve montar UMA vez (AppFrame)',
      )
    }
    _hookActive = true

    async function subscribe(attempt: number) {
      if (unmounted || subscribingRef.current) return
      subscribingRef.current = true
      attemptRef.current = attempt

      
      
      
      
      
      let torndown = false

      
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }

      
      if (channelRef.current) {
        sb.removeChannel(channelRef.current)
        channelRef.current = null
      }

      
      
      await ensureRealtimeAuth(sb)
      if (unmounted) { subscribingRef.current = false; return }

      const ch = sb
        .channel(CHANNEL)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'events' },
          ({ new: row }) => {
            
            
            
            const r = row as Record<string, unknown>
            if (
              typeof r.id === 'string' &&
              typeof r.label === 'string' &&
              typeof r.created_at === 'string' &&
              typeof r.type === 'string'
            ) {
              bus.emit('live', rowToLiveEvent(row as EventRow))
            } else {
              console.warn('[useRealtimeEvents] INSERT payload inválido — ignorado', row)
            }
          },
        )
        .subscribe((status) => {
          
          
          
          if (unmounted) return

          subscribingRef.current = false

          if (status === 'SUBSCRIBED') {
            
            attemptRef.current = 0
            setOnline(true)
            return
          }

          
          
          
          
          if (
            status === 'CHANNEL_ERROR' ||
            status === 'TIMED_OUT' ||
            status === 'CLOSED'
          ) {
            
            
            if (torndown) return
            torndown = true

            setOnline(false)

            
            
            try {
              sb.removeChannel(ch)
            } catch (err) {
              console.warn('[useRealtimeEvents] removeChannel threw', err)
            }
            channelRef.current = null

            
            const nextAttempt = attempt + 1
            const delay = Math.min(3_000 * 2 ** attempt, 30_000)
            reconnectTimerRef.current = setTimeout(() => {
              reconnectTimerRef.current = null
              if (!unmounted) subscribe(nextAttempt)
            }, delay)
          }
        })

      channelRef.current = ch
    }

    subscribe(0)

    return () => {
      unmounted = true
      _hookActive = false
      subscribingRef.current = false
      
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (channelRef.current) {
        sb.removeChannel(channelRef.current)
        channelRef.current = null
      }
      
      
      
    }
  }, []) 

  return { online }
}
