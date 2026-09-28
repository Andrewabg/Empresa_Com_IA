'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSelectedLayoutSegment } from 'next/navigation'
import { Rail } from './Rail'
import { CommandPalette } from './CommandPalette'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { ComposioHealthBanner } from '@/components/ui/ComposioHealthBanner'
import { ConnectionsBanner } from '@/components/ui/ConnectionsBanner'
import { ConfigHealthBanner } from '@/components/ui/ConfigHealthBanner'
import { BrainSyncBanner } from '@/components/ui/BrainSyncBanner'
import { deveMostrarAvisoSync } from '@/lib/brainSyncBanner'
import { ehCenaBare } from '@/lib/cenaBare'
import { useRealtimeEvents } from '@/app/_realtime/useRealtimeEvents'
import { useActiveCockpits } from './useActiveCockpits'
import { useAlertaDoModelo } from './useAlertaDoModelo'
import { ModeloParadoBanner } from '@/components/ui/ModeloParadoBanner'
import type { AlertaDoModelo } from '@/lib/modelo/falhaDoModelo'

interface AppFrameProps {
  children: React.ReactNode
  
  licenseeName?: string | null
  
  initialActiveCockpits?: string[] | null
  
  customPages?: { href: string; titulo: string }[]
  
  branding?: { appName: string; logoUrl: string | null; assistantName: string }
  
  atalhosRail?: { nome: string; url: string }[]
  
  brainSyncOk?: string | null
  
  brainSyncMotivo?: string | null
  
  papel: 'dono' | 'membro' | null | undefined
  
  aprovacoesPendentes?: number
  
  alertaModelo?: AlertaDoModelo | null
}


function RealtimeProvider({ children }: { children: (disconnected: boolean) => React.ReactNode }) {
  const { online } = useRealtimeEvents()
  const everOnlineRef = useRef(false)
  if (online) everOnlineRef.current = true
  const disconnected = everOnlineRef.current && !online
  return <>{children(disconnected)}</>
}

export function AppFrame({ children, licenseeName, papel, initialActiveCockpits, customPages, branding, atalhosRail, brainSyncOk, brainSyncMotivo, aprovacoesPendentes, alertaModelo }: AppFrameProps) {
  
  
  
  
  const segmento = useSelectedLayoutSegment()
  const bare = ehCenaBare(segmento)

  const [paletteOpen, setPaletteOpen] = useState(false)

  const openPalette = useCallback(() => setPaletteOpen(true), [])

  
  
  
  const active = useActiveCockpits(initialActiveCockpits ?? null, !bare)

  
  const alerta = useAlertaDoModelo(alertaModelo ?? null, !bare)

  useEffect(() => {
    if (bare) return 
    function handleKeyDown(e: KeyboardEvent) {
      const isMac = navigator.userAgent.includes('Mac')
      const modifier = isMac ? e.metaKey : e.ctrlKey
      if (modifier && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [bare])

  
  if (bare) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg-base)' }}>{children}</div>
    )
  }

  
  
  
  return (
    <RealtimeProvider>
      {(disconnected) => (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100dvh',
            overflow: 'hidden',
            background: 'var(--bg-base)',
          }}
        >
          {disconnected && <OfflineBanner urgent />}
          {}
          {alerta && <ModeloParadoBanner alerta={alerta} ehDono={papel === 'dono'} />}
          {}
          {papel === 'dono' && (
            <>
              {}
              <ComposioHealthBanner />
              <ConnectionsBanner />
              <ConfigHealthBanner />
            </>
          )}
          {}
          {deveMostrarAvisoSync(brainSyncOk) && <BrainSyncBanner motivo={brainSyncMotivo} />}
          <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <Rail onOpenPalette={openPalette} active={active} customPages={customPages} branding={branding} atalhosRail={atalhosRail} aprovacoesPendentes={aprovacoesPendentes} papel={papel} />

            {}
            <main
              style={{
                flex: 1,
                minWidth: 0,
                height: '100%',
                overflowY: 'auto',
                position: 'relative',
              }}
            >
              {children}
            </main>
          </div>

          {}
          {licenseeName && (
            <footer
              style={{
                flexShrink: 0,
                padding: '7px 16px',
                textAlign: 'center',
                fontSize: '11px',
                color: 'var(--text-tertiary)',
                borderTop: '1px solid var(--border-hairline)',
              }}
            >
              Licenciado para {licenseeName}
            </footer>
          )}

          <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} active={active} papel={papel} />
        </div>
      )}
    </RealtimeProvider>
  )
}
