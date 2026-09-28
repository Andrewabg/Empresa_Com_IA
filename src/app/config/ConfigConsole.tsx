'use client'



import { useState, useEffect, useCallback } from 'react'
import {
  firstPendingSection,
  isValidSectionId,
  type ConfigSectionId,
  type EssentialFlags,
} from '@/lib/config-sections'
import type { ConfigController } from './controller'
import { SectionNav } from './SectionNav'
import { useUpdateAvailable } from './useUpdateAvailable'
import { EssenciaisSection } from './sections/EssenciaisSection'
import { AcoesExternasSection } from './sections/AcoesExternasSection'
import { CanaisSection } from './sections/CanaisSection'
import { FontesSection } from './sections/FontesSection'
import { LicencaSection } from './sections/LicencaSection'
import { PreferenciasSection } from './sections/PreferenciasSection'
import { CustoSection } from './sections/CustoSection'
import { EquipeSection } from './sections/EquipeSection'
import { DangerZoneSection } from './DangerZoneSection'

function readHashSection(): ConfigSectionId | null {
  if (typeof window === 'undefined') return null
  const raw = window.location.hash.replace(/^#/, '')
  return isValidSectionId(raw) ? raw : null
}

export function ConfigConsole({ ctrl }: { ctrl: ConfigController }) {
  const flags: EssentialFlags = ctrl.validity
  const { updateAvailable } = useUpdateAvailable()

  
  const [active, setActive] = useState<ConfigSectionId>(
    () => readHashSection() ?? firstPendingSection(flags),
  )

  
  useEffect(() => {
    function onHash() {
      const h = readHashSection()
      if (h) setActive(h)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const select = useCallback((id: ConfigSectionId) => {
    setActive(id)
    if (typeof window !== 'undefined') window.location.hash = id
  }, [])

  const section = (
    <>
      {active === 'essenciais' && <EssenciaisSection ctrl={ctrl} configured={ctrl.allConfigured} />}
      {active === 'acoesExternas' && <AcoesExternasSection ctrl={ctrl} />}
      {active === 'canais' && <CanaisSection />}
      {active === 'fontes' && ctrl.isDono && <FontesSection />}
      {active === 'licenca' && <LicencaSection />}
      {active === 'preferencias' && <PreferenciasSection />}
      {active === 'custo' && <CustoSection />}
      {active === 'equipe' && <EquipeSection />}
      {active === 'perigo' && ctrl.isDono && <DangerZoneSection ctrl={ctrl} />}
    </>
  )

  return (
    <div className="config-shell">
      <SectionNav active={active} onSelect={select} flags={flags} updateAvailable={updateAvailable} isDono={ctrl.isDono} />
      <div className="config-pane">
        <div aria-hidden className="config-atmos" />
        <div className="config-pane__inner">{section}</div>
      </div>
    </div>
  )
}
