'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { useState, useEffect } from 'react'
import { DIAL_NAMES, DIAL_LABELS, DEFAULT_STYLE, type StyleProfile, type StyleDials } from '@/lib/style'

interface StyleDrawerProps {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function StyleDrawer({ open, onOpenChange }: StyleDrawerProps) {
  const [profile, setProfile] = useState<StyleProfile | null>(null)
  const [dials, setDials] = useState<StyleDials>({ ...DEFAULT_STYLE.dials })
  const [notas, setNotas] = useState('')
  const [learningPaused, setLearningPaused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    fetch('/api/style', { signal: controller.signal })
      .then((r) => r.json())
      .then((d: { style: StyleProfile }) => {
        setProfile(d.style)
        setDials({ ...d.style.dials })
        setNotas(d.style.notas)
        setLearningPaused(d.style.learningPaused)
      })
      .catch((e) => { if ((e as Error).name !== 'AbortError') setError('Não consegui carregar as preferências.') })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [open])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const r = await fetch('/api/style', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dials, notas, learningPaused }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({})) as { error?: string }
        setError(d.error ?? 'Erro ao salvar.')
        return
      }
      const d = await r.json() as { style: StyleProfile }
      setProfile(d.style)
      onOpenChange(false)
    } catch {
      setError('Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    const resetDials = { ...DEFAULT_STYLE.dials }
    setSaving(true)
    setError(null)
    try {
      const r = await fetch('/api/style', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dials: resetDials, notas: '', learningPaused: false }),
      })
      if (!r.ok) { setError('Erro ao resetar.'); return }
      const d = await r.json() as { style: StyleProfile }
      setProfile(d.style)
      setDials(resetDials)
      setNotas('')
      setLearningPaused(false)
    } catch {
      setError('Erro ao resetar.')
    } finally {
      setSaving(false)
    }
  }

  const lastChange = profile?.lastChange

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgb(0 0 0 / 0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
          }}
        />
        <Dialog.Content
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            maxWidth: 480,
            maxHeight: '90dvh',
            overflowY: 'auto',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 24px 80px rgb(0 0 0 / 0.5)',
            zIndex: 101,
          }}
          aria-describedby={undefined}
        >
          <VisuallyHidden asChild>
            <Dialog.Title>Estilo conversacional</Dialog.Title>
          </VisuallyHidden>

          {}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-hairline)',
            }}
          >
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.01em' }}>
              Estilo conversacional
            </span>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Fechar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 26,
                  height: 26,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-hairline)',
                  background: 'transparent',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  fontSize: 16,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </Dialog.Close>
          </div>

          {}
          <div style={{ padding: '20px' }}>
            {loading && (
              <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, padding: '24px 0' }}>
                Carregando…
              </div>
            )}

            {!loading && (
              <>
                {}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {DIAL_NAMES.map((d) => {
                    const label = DIAL_LABELS[d]
                    const val = dials[d]
                    return (
                      <div key={d}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            marginBottom: 6,
                          }}
                        >
                          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
                            {label.titulo}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                            {val < 0
                              ? `${label.neg} (${val})`
                              : val > 0
                                ? `${label.pos} (+${val})`
                                : 'neutro'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              fontSize: 10,
                              color: 'var(--text-tertiary)',
                              width: 68,
                              textAlign: 'right',
                              flexShrink: 0,
                            }}
                          >
                            {label.neg}
                          </span>
                          <input
                            type="range"
                            min={-2}
                            max={2}
                            step={1}
                            value={val}
                            aria-label={label.titulo}
                            onChange={(e) =>
                              setDials((prev) => ({
                                ...prev,
                                [d]: Number(e.target.value) as typeof val,
                              }))
                            }
                            style={{ flex: 1, accentColor: '#28E0C8', cursor: 'pointer' }}
                          />
                          <span
                            style={{
                              fontSize: 10,
                              color: 'var(--text-tertiary)',
                              width: 68,
                              flexShrink: 0,
                            }}
                          >
                            {label.pos}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {}
                <div style={{ marginTop: 22 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                      marginBottom: 6,
                    }}
                  >
                    Notas pessoais
                  </label>
                  <textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    aria-label="Notas de estilo"
                    placeholder="Preferências, apelidos, manias…"
                    rows={3}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: 'var(--surface)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      fontFamily: 'var(--font-ui)',
                      padding: '8px 10px',
                      resize: 'vertical',
                      outline: 'none',
                    }}
                  />
                </div>

                {}
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    id="style-learning-paused"
                    type="checkbox"
                    checked={learningPaused}
                    onChange={(e) => setLearningPaused(e.target.checked)}
                    style={{ accentColor: '#7C5CFF', cursor: 'pointer', width: 14, height: 14 }}
                  />
                  <label
                    htmlFor="style-learning-paused"
                    style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    Pausar aprendizado automático de estilo
                  </label>
                </div>

                {}
                {lastChange && (
                  <div
                    style={{
                      marginTop: 14,
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      fontStyle: 'italic',
                    }}
                  >
                    Última mudança: {lastChange.resumo} — {lastChange.source} — {new Date(lastChange.at).toLocaleDateString('pt-BR')}
                  </div>
                )}

                {}
                {error && (
                  <div style={{ marginTop: 12, fontSize: 12, color: '#f87171' }}>
                    {error}
                  </div>
                )}
              </>
            )}
          </div>

          {}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              borderTop: '1px solid var(--border-hairline)',
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={handleReset}
              disabled={saving || loading || !profile}
              style={{
                padding: '7px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-hairline)',
                background: 'transparent',
                color: 'var(--text-tertiary)',
                fontSize: 12,
                fontFamily: 'var(--font-ui)',
                cursor: saving || loading || !profile ? 'not-allowed' : 'pointer',
                opacity: saving || loading || !profile ? 0.5 : 1,
              }}
            >
              Resetar ao padrão
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading || !profile}
              style={{
                padding: '7px 18px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'linear-gradient(120deg, #28E0C8, #7C5CFF)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'var(--font-ui)',
                cursor: saving || loading || !profile ? 'not-allowed' : 'pointer',
                opacity: saving || loading || !profile ? 0.5 : 1,
              }}
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
