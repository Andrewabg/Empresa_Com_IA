'use client'



import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { bus } from '@/mock/bus'
import { eventoMexeNaFila } from '@/lib/aprovacoes/selo'


const AGRUPAR_MS = 400

export function useAprovacoesPendentes(inicial: number): number {
  const [pendentes, setPendentes] = useState(inicial)
  const pathname = usePathname()
  const timerRef = useRef<number | null>(null)
  const vivoRef = useRef(true)

  const consultar = useCallback(async () => {
    try {
      const r = await fetch('/api/approvals/pendentes')
      if (!r.ok) return
      const j = (await r.json()) as { pendentes?: unknown }
      if (vivoRef.current && typeof j.pendentes === 'number') setPendentes(j.pendentes)
    } catch {
      
    }
  }, [])

  const agendar = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      void consultar()
    }, AGRUPAR_MS)
  }, [consultar])

  useEffect(() => {
    vivoRef.current = true
    return () => {
      vivoRef.current = false
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [])

  
  useEffect(() => bus.on('live', (ev) => { if (eventoMexeNaFila(ev.id)) agendar() }), [agendar])

  
  useEffect(() => {
    function aoVoltar() {
      if (document.visibilityState === 'visible') agendar()
    }
    window.addEventListener('focus', aoVoltar)
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      window.removeEventListener('focus', aoVoltar)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [agendar])

  
  useEffect(() => { agendar() }, [pathname, agendar])

  return pendentes
}
