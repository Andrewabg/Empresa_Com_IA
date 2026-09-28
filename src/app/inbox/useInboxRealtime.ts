'use client'



import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { browserClient, ensureRealtimeAuth } from '@/lib/supabase-browser'
import { conversaDoEvento } from '@/lib/inbox/eventoDoRealtime'


const CHANNEL = 'realtime:inbox'


export function useInboxRealtime({ onChange }: { onChange: (conversaId: string | null) => void }): { online: boolean } {
  const [online, setOnline] = useState(false)

  const channelRef = useRef<RealtimeChannel | null>(null)

  
  const subscribingRef = useRef(false)

  
  
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    const sb = browserClient()
    let unmounted = false

    async function subscribe(attempt: number) {
      if (unmounted || subscribingRef.current) return
      subscribingRef.current = true

      
      
      
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

      const emit = (payload: unknown) => onChangeRef.current(conversaDoEvento(payload))

      const ch = sb
        .channel(CHANNEL)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_externas' }, emit)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mensagens_externas' }, emit)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversas_externas' }, emit)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversas_externas' }, emit)
        .subscribe((status) => {
          
          
          if (unmounted) return

          subscribingRef.current = false

          if (status === 'SUBSCRIBED') {
            setOnline(true)
            return
          }

          
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            if (torndown) return
            torndown = true

            setOnline(false)

            try {
              sb.removeChannel(ch)
            } catch (err) {
              console.warn('[useInboxRealtime] removeChannel lançou', err)
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
