'use client'


import { AnimatePresence, motion } from 'motion/react'
import { springPreset } from '@/lib/motion'
import type { CampanhaView } from '@/lib/estudio/types'
import { CampanhaCard } from './CampanhaCard'

export function CampanhaDrawer({
  open, campanhas, onClose, onProduzir, onReproduzir, producingId, reducedMotion,
  onProduzirArtes, produzindoArtesId,
}: {
  open: boolean
  campanhas: CampanhaView[]
  onClose: () => void
  onProduzir: (id: string) => void
  onReproduzir?: (id: string, index: number) => void
  producingId?: string | null
  reducedMotion: boolean
  onProduzirArtes?: (id: string) => void
  produzindoArtesId?: string | null
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="campanha-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.18 }} onClick={onClose} aria-hidden
            style={{ position: 'fixed', inset: 0, background: 'rgb(0 0 0 / 0.45)', zIndex: 50 }} />
          <motion.aside key="campanha-drawer" role="dialog" aria-modal="true" aria-label="Campanhas"
            initial={reducedMotion ? { opacity: 0 } : { x: '100%' }}
            animate={reducedMotion ? { opacity: 1 } : { x: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { x: '100%' }}
            transition={reducedMotion ? { duration: 0 } : springPreset}
            style={{ position: 'fixed', top: 0, right: 0, height: '100dvh', width: 'min(480px, 90vw)', zIndex: 51, background: 'var(--bg-base)', borderLeft: '1px solid var(--border-hairline)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border-hairline)' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Campanhas</span>
              <button type="button" onClick={onClose} aria-label="Fechar as Campanhas" title="Fechar (Esc)"
                style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)', background: 'transparent', color: 'var(--text-tertiary)', fontSize: 15, lineHeight: 1, cursor: 'pointer' }}>×</button>
            </header>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'clamp(14px, 2vw, 20px)' }}>
              {campanhas.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--text-tertiary)' }}>
                  Nenhuma campanha ainda. Peça à Lia: &quot;planeje uma campanha para…&quot;
                </p>
              ) : (
                <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {campanhas.map((c) => (
                    <CampanhaCard
                      key={c.id}
                      campanha={c}
                      onProduzir={onProduzir}
                      onReproduzir={onReproduzir}
                      producing={producingId === c.id}
                      onProduzirArtes={onProduzirArtes}
                      produzindoArtes={produzindoArtesId === c.id}
                    />
                  ))}
                </ul>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
