'use client'



import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { bus } from '@/mock/bus'
import { ehEventoDeFimAnormal } from '@/lib/conversa/fechamentoDoTurno'
import type { AlertaDoModelo } from '@/lib/modelo/falhaDoModelo'


const AGRUPAR_MS = 400


const RECHECAR_MS = 20_000


export function useAlertaDoModelo(inicial: AlertaDoModelo | null, ativo = true): AlertaDoModelo | null {
  const [alerta, setAlerta] = useState<AlertaDoModelo | null>(inicial)
  const pathname = usePathname()
  const timerRef = useRef<number | null>(null)
  const vivoRef = useRef(true)

  const consultar = useCallback(async () => {
    try {
      const r = await fetch('/api/modelo/alerta')
      if (!r.ok) return
      const j = (await r.json()) as { alerta?: AlertaDoModelo | null }
      if (vivoRef.current) setAlerta(j.alerta ?? null)
    } catch {
      
    }
  }, [])

  const agendar = useCallback(() => {
    if (!ativo) return
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      void consultar()
    }, AGRUPAR_MS)
  }, [consultar, ativo])

  useEffect(() => {
    vivoRef.current = true
    return () => {
      vivoRef.current = false
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [])

  
  useEffect(() => bus.on('live', (ev) => { if (ehEventoDeFimAnormal(ev.id)) agendar() }), [agendar])

  
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

  
  
  useEffect(() => {
    if (!ativo || !alerta) return
    const id = window.setInterval(() => { void consultar() }, RECHECAR_MS)
    return () => window.clearInterval(id)
  }, [ativo, alerta, consultar])

  return alerta
}
