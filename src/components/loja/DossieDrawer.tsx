'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useReducedMotion } from '@/lib/motion'
import { AgentWaveAvatar } from '@/components/avatar/AgentWaveAvatar'
import { Chip } from './Chip'
import { rotuloDeTool } from '@/lib/loja/rotulosDeTools'
import { escolherGerenteDefault } from '@/lib/loja/defaultManager'
import type { MarketingSeedCard } from '@/lib/marketing-store'


export interface Manager {
  id: string
  name: string
  role: string
}

export interface DossieDrawerProps {
  
  card: MarketingSeedCard | null
  managers: Manager[]
  installed: boolean
  
  deFerias?: boolean
  onInstalled: (cardId: string) => void
  onClose: () => void
  
  isDono?: boolean
}

const panelBase: CSSProperties = {
  background: 'var(--bg-base)',
  borderLeft: '1px solid var(--border-hairline)',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 51,
  outline: 'none',
}

const sectionLabel: CSSProperties = {
  margin: '0 0 8px',
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-tertiary)',
}


export function DossieDrawer({ card, managers, installed, deFerias = false, onInstalled, onClose, isDono = true }: DossieDrawerProps) {
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [managerId, setManagerId] = useState<string>(() => escolherGerenteDefault(managers))
  const [status, setStatus] = useState<'idle' | 'installing' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [narrow, setNarrow] = useState(false)
  const [voltando, setVoltando] = useState(false)

  
  async function trazerDeVolta() {
    if (!card || voltando) return
    setVoltando(true)
    setErrorMsg('')
    try {
      const r = await fetch(`/api/agents/${encodeURIComponent(card.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      })
      if (!r.ok) throw new Error('falhou')
      router.refresh()
      onClose()
    } catch {
      setErrorMsg('Não consegui trazer de volta agora. Tente de novo.')
    } finally {
      setVoltando(false)
    }
  }

  const cardId = card?.id ?? null
  
  const sugerido = card?.suggestedManager ?? null

  
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reset é POR ABERTURA (cardId); managers é reconciliado no efeito abaixo
  useEffect(() => {
    setStatus('idle')
    setErrorMsg('')
    setManagerId(escolherGerenteDefault(managers, sugerido))
  }, [cardId])

  
  
  useEffect(() => {
    if (managerId && !managers.some((m) => m.id === managerId)) {
      setManagerId(escolherGerenteDefault(managers, sugerido))
    }
  }, [managers, managerId, sugerido])

  
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 719px)')
    const apply = () => setNarrow(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  
  
  
  
  
  
  
  useEffect(() => {
    if (!cardId) return
    const scroller = (document.querySelector('main') ?? document.body) as HTMLElement
    const prev = scroller.style.overflowY
    scroller.style.overflowY = 'hidden'
    return () => {
      scroller.style.overflowY = prev
    }
  }, [cardId])

  
  useEffect(() => {
    if (!cardId) return
    panelRef.current?.focus()
  }, [cardId])

  
  useEffect(() => {
    if (!cardId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cardId, onClose])

  
  function onKeyDownTrap(e: React.KeyboardEvent) {
    if (e.key !== 'Tab' || !panelRef.current) return
    const focusables = panelRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    if (focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    
    if (document.activeElement === panelRef.current) {
      e.preventDefault()
      if (e.shiftKey) last.focus(); else first.focus()
      return
    }
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  async function handleInstall() {
    if (!card || !managerId || status === 'installing') return
    setStatus('installing')
    setErrorMsg('')
    try {
      const res = await fetch('/api/loja/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seedId: card.id, managerId }),
      })
      
      if (res.ok || res.status === 409) {
        onInstalled(card.id)
        setStatus('idle')
        
        
        
        router.refresh()
        return
      }
      let detail = `HTTP ${res.status}`
      try {
        const j = (await res.json()) as { error?: string }
        if (j?.error) detail = j.error
      } catch {
        
      }
      setStatus('error')
      setErrorMsg(`Não foi possível contratar (${detail}).`)
    } catch (err) {
      setStatus('error')
      setErrorMsg(
        `Não foi possível contratar (${err instanceof Error ? err.message : String(err)}).`,
      )
    }
  }

  const installing = status === 'installing'
  const noManagers = managers.length === 0

  return (
    <AnimatePresence>
      {}
      {card && (
        <motion.div
          key="dossie-backdrop"
          onClick={onClose}
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.2 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgb(0 0 0 / 0.5)',
            backdropFilter: 'blur(2px)',
          }}
        >
          <motion.div
            key={card.id}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dossie-nome"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onKeyDownTrap}
            initial={reducedMotion ? false : narrow ? { y: '100%' } : { x: '100%' }}
            animate={narrow ? { y: 0 } : { x: 0 }}
            exit={narrow ? { y: '100%' } : { x: '100%' }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { type: 'spring' as const, stiffness: 320, damping: 34 }
            }
            style={
              narrow
                ? {
                    ...panelBase,
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: '85vh',
                    borderTop: '1px solid var(--border-hairline)',
                    borderRadius: '16px 16px 0 0',
                  }
                : {
                    ...panelBase,
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: 'min(480px, 100vw)',
                  }
            }
          >
            {}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '24px 24px 18px',
                borderBottom: '1px solid var(--border-hairline)',
              }}
            >
              <AgentWaveAvatar agentId={card.id} size={96} lit={installed} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  id="dossie-nome"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 24,
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: 'var(--text-primary)',
                  }}
                >
                  {card.name}
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>{card.role}</div>
                {card.voice && (
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-tertiary)' }}>
                    <span aria-hidden>∿</span> Voz: {card.voice}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar dossiê"
                style={{
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                  width: 30,
                  height: 30,
                  cursor: 'pointer',
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            {}
            <div
              className="cc-scroll"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 22,
              }}
            >
              <div>
                <p style={sectionLabel}>Por que contratar</p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13.5,
                    lineHeight: 1.6,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {card.descricao}
                </p>
              </div>

              <div>
                <p style={sectionLabel}>Poderes</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {card.toolsResumo.map((t, i) => (
                    <Chip key={`${i}-${t}`}>{rotuloDeTool(t)}</Chip>
                  ))}
                </div>
              </div>

              {card.skills.length > 0 && (
                <div>
                  <p style={sectionLabel}>Skills de fábrica</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {card.skills.map((s, i) => (
                      <Chip key={`${i}-${s}`}>{s}</Chip>
                    ))}
                  </div>
                </div>
              )}

              {}
              <div
                style={{
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface)',
                  padding: 16,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  <span aria-hidden>◍</span> Aprende com a sua empresa
                </p>
                <p
                  style={{
                    margin: '6px 0 0',
                    fontSize: 12.5,
                    lineHeight: 1.55,
                    color: 'var(--text-secondary)',
                  }}
                >
                  A cada tarefa, {card.name} acumula diretrizes e aprendizados sobre o seu
                  negócio — quanto mais trabalha, melhor fica.
                </p>
              </div>
            </div>

            {}
            <div
              style={{
                padding: '16px 24px 20px',
                borderTop: '1px solid var(--border-hairline)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {installed ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      fontSize: 14,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {deFerias ? (
                      <>
                        <span aria-hidden>☾</span> De férias
                      </>
                    ) : (
                      <>
                        <span aria-hidden>✓</span> No seu time
                      </>
                    )}
                  </span>
                  {deFerias && isDono && (
                    <button
                      type="button"
                      onClick={() => void trazerDeVolta()}
                      disabled={voltando}
                      style={{
                        fontSize: 12.5,
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        padding: '8px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-hairline)',
                        background: 'var(--surface-elevated)',
                        fontFamily: 'var(--font-ui)',
                        cursor: voltando ? 'progress' : 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {voltando ? 'Trazendo…' : 'Trazer de volta ao time'}
                    </button>
                  )}
                  {!deFerias && <Link
                    
                    
                    href={`/agente/${encodeURIComponent(card.id)}`}
                    
                    
                    prefetch={false}
                    style={{
                      fontSize: 12.5,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      textDecoration: 'none',
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-hairline)',
                      background: 'var(--surface-elevated)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Abrir estação de trabalho →
                  </Link>}
                </div>
              ) : !isDono ? (
                
                
                <p
                  style={{
                    margin: 0,
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    color: 'var(--text-tertiary)',
                  }}
                >
                  Só o Dono pode contratar novos agentes.
                </p>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label htmlFor="dossie-manager" style={sectionLabel}>
                      Responde a
                    </label>
                    {noManagers ? (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12.5,
                          lineHeight: 1.5,
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        Nenhum gerente disponível ainda.
                      </p>
                    ) : (
                      <select
                        id="dossie-manager"
                        value={managerId}
                        onChange={(e) => {
                          setManagerId(e.target.value)
                          if (status === 'error') setStatus('idle')
                        }}
                        disabled={installing}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          background: 'var(--surface-elevated)',
                          border: '1px solid var(--border-hairline)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-ui)',
                          fontSize: 13,
                          padding: '9px 11px',
                          cursor: installing ? 'not-allowed' : 'pointer',
                          outline: 'none',
                        }}
                      >
                        {managers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} · {m.role}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {status === 'error' && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12.5,
                        lineHeight: 1.45,
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {errorMsg}
                    </p>
                  )}

                  {}
                  <button
                    type="button"
                    onClick={handleInstall}
                    disabled={installing || noManagers || !managerId}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      padding: '12px 18px',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 600,
                      fontFamily: 'var(--font-ui)',
                      cursor: installing || noManagers || !managerId ? 'not-allowed' : 'pointer',
                      opacity: installing || noManagers || !managerId ? 0.5 : 1,
                    }}
                  >
                    {installing ? 'Contratando…' : `Contratar ${card.name}`}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
