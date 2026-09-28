'use client'







import { useCallback, useEffect, useRef, useState } from 'react'
import type { CriativoView, BriefEstruturado } from '@/lib/design/types'
import { briefCoverage, BRIEF_SLOTS, type BriefSlot } from '@/lib/design/briefCoverage'
import { FORMATOS_DESIGN, getFormatoDesign } from '@/lib/design/formatos'
import { EstudioCard } from '@/components/copy/EstudioCard'
import { useArtifactUrl } from './useArtifactUrl'

const AMBAR = 'rgb(214 158 46)'

export interface BriefCardProps {
  criativo: CriativoView 
  referencias: { id: string; titulo: string }[] 
  onPreencher: (id: string, patch: Record<string, unknown>) => void | Promise<void> 
  onGerar: (id: string) => void | Promise<void> 
  onPickReferencia: () => void 
  
  onDescartar: (id: string) => void
}

export function BriefCard({ criativo, referencias, onPreencher, onGerar, onPickReferencia, onDescartar }: BriefCardProps) {
  const brief = (criativo.brief ?? {}) as BriefEstruturado
  const cobertura = briefCoverage(brief)
  const minDone = cobertura.minDone
  const formatoNome = getFormatoDesign(criativo.formato).nome

  const preencher = useCallback(
    (patch: Record<string, unknown>) => onPreencher(criativo.id, patch),
    [onPreencher, criativo.id],
  )

  return (
    <EstudioCard
      eyebrow={formatoNome}
      headerRight={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <DescartarBtn onDescartar={() => onDescartar(criativo.id)} />
          <span
            style={{
              display: 'inline-block',
              padding: '1px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
              color: AMBAR,
              background: `color-mix(in srgb, ${AMBAR} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${AMBAR} 30%, transparent)`,
            }}
          >
            Briefing
          </span>
        </span>
      }
    >
      {}
      {criativo.titulo && (
        <h2
          style={{
            margin: '-2px 0 12px',
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.3,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          {criativo.titulo}
        </h2>
      )}

      {}
      <div
        style={{
          padding: '12px 14px',
          borderRadius: 'var(--radius-md)',
          border: `1px solid color-mix(in srgb, ${AMBAR} 30%, transparent)`,
          background: `color-mix(in srgb, ${AMBAR} 8%, transparent)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: AMBAR }}>O Téo precisa de você</span>
          <GerarBtn minDone={minDone} onGerar={() => onGerar(criativo.id)} />
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
          {minDone
            ? 'Tudo pronto — clique em Gerar anúncio pra o Téo desenhar as provas ancoradas neste brief.'
            : `Preencha o essencial pra liberar a geração — faltam: ${cobertura.pendentes
                .map((g) => g.label.toLowerCase())
                .join(', ')}.`}
        </p>
      </div>

      {}
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {BRIEF_SLOTS.map((slot) => (
          <BriefField
            key={`${criativo.id}:${slot.id}`}
            slot={slot}
            value={typeof brief[slot.id] === 'string' ? (brief[slot.id] as string) : ''}
            onSave={(val) => preencher({ [slot.id]: val })}
          />
        ))}
      </div>

      {}
      <div style={{ marginTop: 14 }}>
        <FieldLabel>Formato / posicionamento</FieldLabel>
        <select
          value={criativo.formato}
          onChange={(e) => preencher({ placement: e.target.value })}
          aria-label="Formato do anúncio"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '8px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-hairline)',
            background: 'var(--surface)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-ui)',
            fontSize: 13,
            outline: 'none',
            cursor: 'pointer',
            colorScheme: 'dark', 
          }}
        >
          {FORMATOS_DESIGN.map((f) => (
            <option key={f.slug} value={f.slug}>
              {f.nome} — {f.uso}
            </option>
          ))}
        </select>
      </div>

      {}
      <div style={{ marginTop: 14 }}>
        <RostoToggle
          on={!!brief.usarRosto}
          semReferencia={!brief.referenciaId}
          onToggle={(v) => preencher({ usarRosto: v })}
        />
      </div>

      {}
      <div style={{ marginTop: 14 }}>
        <FieldLabel>Foto de referência {brief.usarRosto ? '(o rosto real)' : '(remix)'}</FieldLabel>
        <ReferenciaPicker
          referencias={referencias}
          selecionada={brief.referenciaId}
          onSelecionar={(refId) => preencher({ referenciaId: refId })}
          onEnviar={onPickReferencia}
        />
      </div>

      <p style={{ margin: '14px 0 0', fontSize: 11, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
        Você pode digitar aqui, puxar do Cérebro ou simplesmente falar com o Téo — ele grava tudo no
        brief antes de gerar.
      </p>
    </EstudioCard>
  )
}



function DescartarBtn({ onDescartar }: { onDescartar: () => void }) {
  const [armado, setArmado] = useState(false)
  useEffect(() => {
    if (!armado) return
    const t = setTimeout(() => setArmado(false), 4000)
    return () => clearTimeout(t)
  }, [armado])
  return (
    <button
      type="button"
      onClick={() => { if (armado) { setArmado(false); onDescartar() } else setArmado(true) }}
      title="Fechar este briefing sem gerar. O Téo para de conduzir esta frente."
      style={{
        padding: '2px 9px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        color: armado ? 'var(--reject)' : 'var(--text-tertiary)',
        background: armado ? 'color-mix(in srgb, var(--reject) 10%, transparent)' : 'transparent',
        border: `1px solid ${armado ? 'color-mix(in srgb, var(--reject) 35%, transparent)' : 'var(--border-hairline)'}`,
      }}
    >
      {armado ? 'Descartar mesmo?' : 'Descartar'}
    </button>
  )
}


function GerarBtn({ minDone, onGerar }: { minDone: boolean; onGerar: () => void | Promise<void> }) {
  const [gerando, setGerando] = useState(false)
  const disabled = !minDone || gerando

  const click = async () => {
    if (disabled) return
    setGerando(true)
    try {
      await onGerar()
    } finally {
      setGerando(false)
    }
  }

  return (
    <button
      type="button"
      onClick={click}
      disabled={disabled}
      title={minDone ? 'Gerar as provas do anúncio' : 'Preencha objetivo e oferta primeiro'}
      style={{
        padding: '6px 14px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        cursor: disabled ? 'default' : 'pointer',
        color: minDone ? 'var(--text-primary)' : 'var(--text-tertiary)',
        border: '1px solid transparent',
        opacity: gerando ? 0.7 : 1,
        background: minDone
          ? 'linear-gradient(var(--surface-elevated), var(--surface-elevated)) padding-box, linear-gradient(120deg, var(--wave-from), var(--wave-to)) border-box'
          : 'var(--surface-elevated)',
        borderColor: minDone ? undefined : 'var(--border-hairline)',
        transition: 'opacity 120ms ease',
      }}
    >
      {gerando ? 'Gerando…' : 'Gerar anúncio'}
    </button>
  )
}


function FieldLabel({ children, amber }: { children: React.ReactNode; amber?: boolean }) {
  return (
    <label
      style={{
        display: 'block',
        marginBottom: 5,
        fontSize: 11.5,
        fontWeight: amber ? 600 : 500,
        color: amber ? AMBAR : 'var(--text-tertiary)',
      }}
    >
      {children}
    </label>
  )
}


function BriefField({
  slot,
  value,
  onSave,
}: {
  slot: BriefSlot
  value: string
  onSave: (val: string) => void | Promise<void>
}) {
  const [val, setVal] = useState(value)
  const focusedRef = useRef(false)
  const committedRef = useRef(value) 
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  
  
  useEffect(() => {
    if (!focusedRef.current) { setVal(value); committedRef.current = value }
  }, [value])

  const vazioEssencial = slot.essencial && !val.trim()

  const commit = useCallback(() => {
    const limpo = val.trim()
    if (limpo === committedRef.current.trim()) return 
    committedRef.current = limpo
    void onSave(limpo)
  }, [val, onSave])

  
  const inserir = useCallback(
    (trecho: string) => {
      const base = val.trim()
      const proximo = base ? `${base}\n${trecho.trim()}` : trecho.trim()
      setVal(proximo)
      committedRef.current = proximo
      void onSave(proximo)
      taRef.current?.focus()
    },
    [val, onSave],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <FieldLabel amber={vazioEssencial}>
          {slot.label}
          {slot.essencial && <span style={{ color: AMBAR }}> *</span>}
        </FieldLabel>
        <PuxarCerebro
          query={val.trim() || slot.label}
          onInserir={inserir}
        />
      </div>
      <textarea
        ref={taRef}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onFocus={() => {
          focusedRef.current = true
        }}
        onBlur={() => {
          focusedRef.current = false
          commit()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            commit()
            e.currentTarget.blur()
          }
        }}
        rows={2}
        placeholder={slot.seed}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          resize: 'vertical',
          minHeight: 40,
          padding: '8px 10px',
          borderRadius: 'var(--radius-sm)',
          border: `1px solid ${vazioEssencial ? `color-mix(in srgb, ${AMBAR} 40%, transparent)` : 'var(--border-hairline)'}`,
          background: vazioEssencial ? `color-mix(in srgb, ${AMBAR} 5%, transparent)` : 'var(--surface)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          lineHeight: 1.5,
          outline: 'none',
        }}
      />
    </div>
  )
}


function PuxarCerebro({ query, onInserir }: { query: string; onInserir: (trecho: string) => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notas, setNotas] = useState<{ titulo: string; trecho: string }[] | null>(null)
  const boxRef = useRef<HTMLDivElement | null>(null)

  const buscar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/design/cerebro?q=${encodeURIComponent(query)}`)
      const j = (r.ok ? await r.json() : null) as { ok?: boolean; notas?: { titulo: string; trecho: string }[] } | null
      setNotas(j?.notas ?? [])
    } catch {
      setNotas([])
    } finally {
      setLoading(false)
    }
  }, [query])

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev
      if (next) void buscar()
      return next
    })
  }, [buscar])

  
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={boxRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={toggle}
        title="Puxar um trecho do Segundo Cérebro"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 'var(--radius-sm)',
          fontSize: 10.5,
          fontWeight: 500,
          color: 'var(--text-tertiary)',
          background: 'transparent',
          border: '1px solid var(--border-hairline)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <BrainGlyph />
        puxar do Cérebro
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Trechos do Cérebro"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 20,
            width: 'min(320px, 78vw)',
            maxHeight: 240,
            overflowY: 'auto',
            padding: 6,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-hairline)',
            background: 'var(--bg-base)',
            boxShadow: '0 10px 30px rgb(0 0 0 / 0.35)',
          }}
        >
          {loading ? (
            <p style={{ margin: 0, padding: '8px 8px', fontSize: 11.5, color: 'var(--text-tertiary)' }}>
              Buscando no Cérebro…
            </p>
          ) : notas && notas.length > 0 ? (
            notas.map((n, i) => (
              <button
                key={`${n.titulo}-${i}`}
                type="button"
                onClick={() => {
                  onInserir(n.trecho)
                  setOpen(false)
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '7px 9px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  font: 'inherit',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-elevated)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {n.titulo && (
                  <span
                    style={{
                      display: 'block',
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: 'var(--text-tertiary)',
                      marginBottom: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {n.titulo}
                  </span>
                )}
                <span style={{ display: 'block', fontSize: 12, lineHeight: 1.45 }}>
                  {n.trecho.length > 160 ? `${n.trecho.slice(0, 160)}…` : n.trecho}
                </span>
              </button>
            ))
          ) : (
            <p style={{ margin: 0, padding: '8px 8px', fontSize: 11.5, color: 'var(--text-tertiary)' }}>
              Nada no Cérebro pra isso ainda — digite ou fale com o Téo.
            </p>
          )}
        </div>
      )}
    </div>
  )
}


function RostoToggle({
  on,
  semReferencia,
  onToggle,
}: {
  on: boolean
  semReferencia: boolean
  onToggle: (v: boolean) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Usar um rosto real no anúncio</span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => onToggle(!on)}
          title="Alternar uso de rosto real"
          style={{
            position: 'relative',
            width: 42,
            height: 24,
            flexShrink: 0,
            borderRadius: 99,
            border: '1px solid var(--border-hairline)',
            background: on
              ? 'linear-gradient(120deg, var(--wave-from), var(--wave-to))'
              : 'var(--surface-elevated)',
            cursor: 'pointer',
            transition: 'background 140ms ease',
            padding: 0,
          }}
        >
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: 2,
              left: on ? 20 : 2,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: 'var(--bg-base)',
              transition: 'left 140ms ease',
            }}
          />
        </button>
      </div>
      {on && semReferencia && (
        <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: AMBAR }}>
          Anexe a foto do rosto abaixo pra o Téo usar como referência.
        </p>
      )}
    </div>
  )
}


function ReferenciaPicker({
  referencias,
  selecionada,
  onSelecionar,
  onEnviar,
}: {
  referencias: { id: string; titulo: string }[]
  selecionada?: string
  onSelecionar: (refId: string) => void
  onEnviar: () => void
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}>
      {referencias.map((r) => (
        <RefThumb
          key={r.id}
          id={r.id}
          titulo={r.titulo}
          selecionada={selecionada === r.id}
          onClick={() => onSelecionar(r.id)}
        />
      ))}
      <button
        type="button"
        onClick={onEnviar}
        title="Enviar uma foto de referência (PNG, JPG ou WebP)"
        style={{
          display: 'grid',
          placeItems: 'center',
          gap: 3,
          width: 56,
          height: 56,
          flexShrink: 0,
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--border-hairline)',
          background: 'transparent',
          color: 'var(--text-tertiary)',
          cursor: 'pointer',
          fontSize: 10,
          lineHeight: 1.2,
        }}
      >
        <ClipGlyph />
        enviar
      </button>
    </div>
  )
}


function RefThumb({
  id,
  titulo,
  selecionada,
  onClick,
}: {
  id: string
  titulo: string
  selecionada: boolean
  onClick: () => void
}) {
  const url = useArtifactUrl(id)
  const selStyle: React.CSSProperties = selecionada
    ? {
        border: '2px solid transparent',
        background:
          'linear-gradient(var(--surface), var(--surface)) padding-box, linear-gradient(120deg, var(--wave-from), var(--wave-to)) border-box',
      }
    : { border: '1px solid var(--border-hairline)', background: 'var(--surface-elevated)' }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selecionada}
      title={`Usar "${titulo}" como referência`}
      style={{
        position: 'relative',
        width: 56,
        height: 56,
        flexShrink: 0,
        padding: 0,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        cursor: 'pointer',
        ...selStyle,
      }}
    >
      {url ? (
        <img
          src={url}
          alt={titulo}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 'var(--radius-md)' }}
        />
      ) : (
        <span aria-hidden style={{ display: 'block', width: '100%', height: '100%', background: 'var(--surface-elevated)' }} />
      )}
      {selecionada && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--wave-from)',
          }}
        >
          ★
        </span>
      )}
    </button>
  )
}

function BrainGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6 2.5a2 2 0 0 0-2 2 2 2 0 0 0-1 3.6A2 2 0 0 0 4 11.5a2 2 0 0 0 2 2V2.5ZM10 2.5a2 2 0 0 1 2 2 2 2 0 0 1 1 3.6 2 2 0 0 1-1 3.4 2 2 0 0 1-2 2V2.5Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  )
}


function ClipGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M12.5 7.2l-4.7 4.7a2.6 2.6 0 0 1-3.7-3.7l4.9-4.9a1.7 1.7 0 0 1 2.4 2.4l-4.9 4.9a0.8 0.8 0 0 1-1.2-1.2l4.4-4.4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
