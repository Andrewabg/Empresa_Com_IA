'use client'



import { useMemo, useRef, useState } from 'react'
import type { SecaoLoja } from '@/lib/marketing-store'
import { lojaLiberada, type LicenseState } from '@/lib/license-state'
import { selectLojaBanner } from '@/lib/license-copy'
import { LojaHero } from '@/components/loja/LojaHero'
import { DeptSection } from '@/components/loja/DeptSection'
import { DossieDrawer, type Manager } from '@/components/loja/DossieDrawer'
import { LojaEmptyState } from '@/components/loja/LojaEmptyState'
import { SobMedidaCard } from '@/components/loja/SobMedidaCard'

interface LojaClientProps {
  secoes: SecaoLoja[]
  installed: string[]
  
  deFerias?: string[]
  managers: Manager[]
  licenseState: LicenseState
  firehoseReason?: string | null
  
  isDono?: boolean
}

export function LojaClient({ secoes, installed: initialInstalled, deFerias = [], managers, licenseState, firehoseReason, isDono = true }: LojaClientProps) {
  const [installedSet, setInstalledSet] = useState<Set<string>>(() => new Set(initialInstalled))
  const feriasSet = useMemo(() => new Set(deFerias), [deFerias])
  const [dossieId, setDossieId] = useState<string | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  
  const cards = secoes.flatMap((s) => s.cards)
  const dossieCard = cards.find((c) => c.id === dossieId) ?? null
  const banner = selectLojaBanner(licenseState, cards.length > 0, firehoseReason)
  
  
  
  
  const criacaoOn = lojaLiberada(licenseState) && isDono

  function markInstalled(id: string) {
    setInstalledSet((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  function openDossie(id: string) {
    triggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    setDossieId(id)
  }

  function closeDossie() {
    setDossieId(null)
    triggerRef.current?.focus()
    triggerRef.current = null
  }

  
  function handleAvatarClick(id: string) {
    document
      .getElementById(`loja-card-${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    openDossie(id)
  }

  return (
    <div
      style={{
        
        
        maxWidth: 1760,
        margin: '0 auto',
        padding: '0 clamp(24px, 3vw, 44px) 64px',
      }}
    >
      {!banner && (
        <LojaHero cards={cards} installedSet={installedSet} onAvatarClick={handleAvatarClick} />
      )}

      {}
      {criacaoOn && (
        <div style={{ marginTop: banner ? 'clamp(24px, 4vh, 40px)' : 0 }}>
          <SobMedidaCard />
        </div>
      )}

      {banner ? (
        
        
        
        <LojaEmptyState text={banner.text} tone={banner.tone} acao={isDono ? banner.acao : undefined} />
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(28px, 3vw, 40px)',
            marginTop: 8,
          }}
        >
          {secoes.map((secao) => (
            <DeptSection
              key={secao.titulo}
              secao={secao}
              installedSet={installedSet}
              feriasSet={feriasSet}
              onOpen={openDossie}
            />
          ))}
        </div>
      )}

      <DossieDrawer
        card={dossieCard}
        managers={managers}
        installed={dossieCard ? installedSet.has(dossieCard.id) : false}
        deFerias={dossieCard ? feriasSet.has(dossieCard.id) : false}
        onInstalled={markInstalled}
        onClose={closeDossie}
        isDono={isDono}
      />
    </div>
  )
}
