'use client'


import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useReducedMotion, springPreset } from '@/lib/motion'
import { artifactFilename } from '@/lib/artifacts'
import type { ArtifactRow } from '@/data/artifacts'
import { KIND_LABEL, KIND_MIME, KindFull, triggerDownload, downloadBlobText } from './artifactKinds'

export function ArtifactLightbox({
  artifacts,
  openId,
  onOpenChange,
}: {
  
  artifacts: ArtifactRow[]
  openId: string | null
  onOpenChange: (id: string | null) => void
}) {
  const reducedMotion = useReducedMotion() ?? false
  const index = openId ? artifacts.findIndex((a) => a.id === openId) : -1
  const active = index >= 0 ? artifacts[index] : null

  const go = useCallback(
    (delta: number) => {
      if (index < 0) return
      const next = index + delta
      if (next >= 0 && next < artifacts.length) onOpenChange(artifacts[next].id)
    },
    [index, artifacts, onOpenChange],
  )

  useEffect(() => {
    if (!active) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(null)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, go, onOpenChange])

  
  
  
  const panelRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const isOpen = !!active
  useEffect(() => {
    if (isOpen) {
      if (!triggerRef.current) {
        triggerRef.current = (document.activeElement as HTMLElement) ?? null
        
        requestAnimationFrame(() => panelRef.current?.focus())
      }
    } else if (triggerRef.current) {
      triggerRef.current.focus?.()
      triggerRef.current = null
    }
  }, [isOpen])

  
  
  
  const [erroDownload, setErroDownload] = useState<string | null>(null)
  const falharDownload = (msg: string) => {
    setErroDownload(msg)
    setTimeout(() => setErroDownload(null), 2500)
  }

  const onCopy = async () => {
    if (!active || active.kind === 'imagem') return
    try {
      await navigator.clipboard.writeText(active.content ?? '')
    } catch {
      
    }
  }
  const onDownload = async () => {
    if (!active) return
    const filename = artifactFilename(active.title, active.kind)
    if (active.kind === 'imagem') {
      try {
        const res = await fetch(`/api/artifacts/${active.id}/url`)
        if (!res.ok) {
          falharDownload(res.status === 404 ? 'Indisponível' : 'Falhou')
          return
        }
        const { url } = (await res.json()) as { url?: string }
        if (!url) {
          falharDownload('Falhou')
          return
        }
        const blob = await (await fetch(url)).blob()
        const obj = URL.createObjectURL(blob)
        triggerDownload(obj, filename)
        setTimeout(() => URL.revokeObjectURL(obj), 0)
      } catch {
        falharDownload('Falhou')
      }
      return
    }
    downloadBlobText(active.content ?? '', KIND_MIME[active.kind], filename)
  }

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="lightbox-backdrop"
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.18 }}
          onClick={() => onOpenChange(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            background: 'rgb(0 0 0 / 0.6)',
            display: 'grid',
            placeItems: 'center',
            padding: 'clamp(12px, 3vw, 40px)',
          }}
        >
          <motion.div
            key={active.id}
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={`Entrega: ${active.title}`}
            onClick={(e) => e.stopPropagation()}
            initial={reducedMotion ? false : { opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            transition={reducedMotion ? { duration: 0 } : springPreset}
            style={{
              width: 'min(920px, 92vw)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-base)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 32px 80px -32px rgb(0 0 0 / 0.8)',
              overflow: 'hidden',
              outline: 'none', 
            }}
          >
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid var(--border-hairline)' }}>
              {artifacts.length > 1 && (
                <>
                  <button type="button" onClick={() => go(-1)} disabled={index <= 0} aria-label="Entrega anterior" style={navBtn(index <= 0)}>‹</button>
                  <button type="button" onClick={() => go(1)} disabled={index >= artifacts.length - 1} aria-label="Próxima entrega" style={navBtn(index >= artifacts.length - 1)}>›</button>
                </>
              )}
              <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={active.title}>
                {active.title}
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)', padding: '2px 7px' }}>
                {KIND_LABEL[active.kind]}
              </span>
              {active.kind !== 'imagem' && (
                <button type="button" onClick={onCopy} style={textBtn} title="Copiar conteúdo">Copiar</button>
              )}
              <button type="button" onClick={onDownload} aria-live="polite" style={textBtn} title="Baixar arquivo">{erroDownload ?? 'Baixar'}</button>
              <button type="button" onClick={() => onOpenChange(null)} aria-label="Fechar" style={iconBtn}>✕</button>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }} className="awave-scroll-fantasma">
              <KindFull key={active.id} artifact={active} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const textBtn: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-hairline)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  fontSize: 11.5,
  fontFamily: 'var(--font-ui)',
  cursor: 'pointer',
}
const iconBtn: React.CSSProperties = { ...textBtn, width: 28, height: 28, display: 'grid', placeItems: 'center', padding: 0 }
function navBtn(disabled: boolean): React.CSSProperties {
  return { ...iconBtn, opacity: disabled ? 0.35 : 1, cursor: disabled ? 'default' : 'pointer', fontSize: 16 }
}
