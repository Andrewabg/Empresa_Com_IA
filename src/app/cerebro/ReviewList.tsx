'use client'



import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { ImportCandidateView, ImportView } from '@/lib/imports/progress'
import type { ImageQueueItem } from '@/lib/imports/imageQueueView'
import {
  estadoSelecaoGeral,
  keymapTriagem,
  progressoRevisao,
  snippetDoCorpo,
} from '@/lib/imports/reviewTriage'
import { FileGlyph, InlineNote, StatusDot } from '@/app/cerebro/ImportDropzone'



const SUCCESS_VAR = 'var(--approve)'
const ERROR_VAR = 'var(--reject)'

const WAVE_GRADIENT = 'linear-gradient(120deg, var(--wave-from), var(--wave-to))'







function Checkbox({
  checked,
  indeterminate = false,
  disabled = false,
  onToggle,
  ariaLabel,
}: {
  checked: boolean
  indeterminate?: boolean
  disabled?: boolean
  onToggle: () => void
  ariaLabel: string
}) {
  const ativo = checked || indeterminate
  return (
    <span
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) onToggle()
      }}
      onKeyDown={(e) => {
        if (disabled) return
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          e.stopPropagation()
          onToggle()
        }
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 17,
        height: 17,
        flex: '0 0 auto',
        boxSizing: 'border-box',
        borderRadius: 5,
        border: ativo ? '1px solid transparent' : '1.5px solid var(--text-tertiary)',
        background: ativo ? WAVE_GRADIENT : 'transparent',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'background 130ms ease, border-color 130ms ease',
        outline: 'none',
      }}
    >
      {checked && !indeterminate && (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M2.6 6.4 L4.9 8.8 L9.4 3.4"
            stroke="var(--bg-base)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {indeterminate && (
        <span
          aria-hidden="true"
          style={{ width: 8, height: 2, borderRadius: 1, background: 'var(--bg-base)' }}
        />
      )}
    </span>
  )
}



export interface ReviewListProps {
  view: ImportView
  context: string | null
  reduceMotion: boolean
  
  emAcao: Set<number>
  
  busyAll: boolean
  
  sel: Set<number>
  onToggleSel: (id: number) => void
  onToggleTodos: () => void
  reviewErr: string | null
  editingId: number | null
  editTitulo: string
  editCorpo: string
  onStartEdit: (c: ImportCandidateView) => void
  onCancelEdit: () => void
  onEditTituloChange: (v: string) => void
  onEditCorpoChange: (v: string) => void
  onSaveEdit: (cid: number, titulo: string, corpo: string) => Promise<void>
  onApprove: (cid: number) => Promise<void>
  onReject: (cid: number) => Promise<void>
  onApproveAll: () => Promise<void>
  onRejectAll: () => Promise<void>
  onApproveSelected: () => Promise<void>
  onRejectSelected: () => Promise<void>
  
  totalRevisao: number
  imagens: ImageQueueItem[]
  imgUrls: Record<number, string>
  imgBusy: number | null
  imgErr: string | null
  onImagemAcao: (n: number, acao: 'ler' | 'descartar') => Promise<void>
}



export default function ReviewList({
  view,
  context,
  reduceMotion,
  emAcao,
  busyAll,
  sel,
  onToggleSel,
  onToggleTodos,
  reviewErr,
  editingId,
  editTitulo,
  editCorpo,
  onStartEdit,
  onCancelEdit,
  onEditTituloChange,
  onEditCorpoChange,
  onSaveEdit,
  onApprove,
  onReject,
  onApproveAll,
  onRejectAll,
  onApproveSelected,
  onRejectSelected,
  totalRevisao,
  imagens,
  imgUrls,
  imgBusy,
  imgErr,
  onImagemAcao,
}: ReviewListProps) {
  const note = context?.trim() || null

  
  const candidatosVisiveis = (view.candidates ?? []).filter((c) => !emAcao.has(c.id))
  const idsVisiveis = candidatosVisiveis.map((c) => c.id)
  const geral = estadoSelecaoGeral(idsVisiveis, sel)
  const { revisados, fracao } = progressoRevisao(totalRevisao, candidatosVisiveis.length)

  
  const loteBloqueado = busyAll || emAcao.size > 0

  
  const imagensVisiveis = (imagens ?? []).filter((img) => img.status !== 'discarded')

  
  const [aberto, setAberto] = useState<Set<number>>(new Set())
  const toggleAberto = (id: number) =>
    setAberto((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  
  const [focoIdx, setFocoIdx] = useState(0)
  useEffect(() => {
    const max = Math.max(0, candidatosVisiveis.length - 1)
    setFocoIdx((i) => Math.min(Math.max(0, i), max))
  }, [candidatosVisiveis.length])

  const onKeyDown = (e: React.KeyboardEvent) => {
    
    const ative = document.activeElement as HTMLElement | null
    const tag = ative?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || ative?.isContentEditable) return

    
    if (e.key === 'Escape') {
      if (editingId != null) {
        e.preventDefault()
        onCancelEdit()
      }
      return
    }

    const acao = keymapTriagem(e.key)
    if (!acao) return
    e.preventDefault()

    if (acao === 'baixo') {
      setFocoIdx((i) => Math.min(i + 1, candidatosVisiveis.length - 1))
      return
    }
    if (acao === 'cima') {
      setFocoIdx((i) => Math.max(i - 1, 0))
      return
    }

    const c = candidatosVisiveis[focoIdx]
    if (!c) return
    switch (acao) {
      case 'aprovar':
        if (!loteBloqueado) void onApprove(c.id)
        break
      case 'descartar':
        if (!loteBloqueado) void onReject(c.id)
        break
      case 'editar':
        onStartEdit(c)
        break
      case 'selecionar':
        onToggleSel(c.id)
        break
      case 'expandir':
        toggleAberto(c.id)
        break
    }
  }

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 6 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={reduceMotion ? undefined : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '18px 20px',
        background: 'var(--surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 15.5,
            fontWeight: 640,
            color: 'var(--text-primary)',
          }}
        >
          Revisar
        </div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: 'var(--text-secondary)' }}>
          {view.detail}
        </div>
        {note && (
          <div
            title={note}
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 11.5,
              color: 'var(--text-tertiary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              marginTop: 1,
            }}
          >
            Ensinando: &ldquo;{note}&rdquo;
          </div>
        )}

        {}
        {totalRevisao > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
            <div
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 11.5,
                color: 'var(--text-tertiary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {revisados} de {totalRevisao} revisados
            </div>
            <div
              aria-hidden="true"
              style={{
                width: '100%',
                height: 4,
                borderRadius: 999,
                background: 'var(--surface-elevated)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${fracao * 100}%`,
                  height: '100%',
                  background: WAVE_GRADIENT,
                  transition: 'width .3s ease',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          paddingBottom: 10,
          borderBottom: '1px solid var(--border-hairline)',
        }}
      >
        {}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'var(--font-ui)',
            fontSize: 12.5,
            color: 'var(--text-secondary)',
          }}
        >
          <Checkbox
            checked={geral === 'cheio'}
            indeterminate={geral === 'parcial'}
            disabled={candidatosVisiveis.length === 0}
            onToggle={onToggleTodos}
            ariaLabel="Selecionar todos"
          />
          <span
            onClick={() => {
              if (candidatosVisiveis.length > 0) onToggleTodos()
            }}
            style={{ cursor: candidatosVisiveis.length === 0 ? 'default' : 'pointer' }}
          >
            Selecionar todos
          </span>
        </span>

        <div style={{ flex: '1 1 auto' }} />

        {}
        {sel.size > 0 && (
          <>
            <BatchButton
              label={`Aprovar ${sel.size} selecionados`}
              disabled={loteBloqueado}
              variant="approve"
              onClick={() => void onApproveSelected()}
            />
            <BatchButton
              label={`Descartar ${sel.size} selecionados`}
              disabled={loteBloqueado}
              variant="ghost"
              onClick={() => void onRejectSelected()}
            />
          </>
        )}

        {}
        <BatchButton
          label={busyAll ? 'Aprovando…' : 'Aprovar todos'}
          disabled={loteBloqueado}
          variant="wave"
          onClick={() => void onApproveAll()}
        />
        {}
        <BatchButton
          label="Descartar todos"
          disabled={loteBloqueado}
          variant="ghost"
          onClick={() => void onRejectAll()}
        />
      </div>

      {}
      {candidatosVisiveis.length === 0 ? (
        <div
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 13,
            color: 'var(--text-tertiary)',
            padding: '10px 0',
          }}
        >
          {(view.candidates ?? []).length === 0 ? 'carregando…' : 'Tudo revisado.'}
        </div>
      ) : (
        <div
          role="listbox"
          tabIndex={0}
          aria-label="Fatos para revisar. Use as setas para navegar, A aprova, R descarta, E edita"
          onKeyDown={onKeyDown}
          style={{ outline: 'none' }}
        >
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <AnimatePresence initial={false}>
              {candidatosVisiveis.map((c, i) => {
                const isEditing = editingId === c.id
                const isAberto = aberto.has(c.id)
                const isFocado = i === focoIdx
                const isSel = sel.has(c.id)
                return (
                  <motion.li
                    key={c.id}
                    layout={!reduceMotion}
                    initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, scale: 0.98 }}
                    transition={
                      reduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
                    }
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: 'var(--radius-md)',
                      
                      boxShadow: isFocado ? '0 0 0 1px var(--border-strong, var(--text-tertiary))' : 'none',
                      overflow: 'hidden',
                    }}
                  >
                    {isEditing ? (
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px' }}>
                        <input
                          type="text"
                          value={editTitulo}
                          onChange={(e) => onEditTituloChange(e.target.value)}
                          
                          
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.preventDefault()
                              onCancelEdit()
                            }
                          }}
                          placeholder="Título do fato"
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            fontFamily: 'var(--font-ui)',
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            background: 'var(--surface)',
                            border: '1px solid var(--border-hairline)',
                            borderRadius: 'var(--radius-sm)',
                            outline: 'none',
                          }}
                        />
                        <textarea
                          value={editCorpo}
                          onChange={(e) => onEditCorpoChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.preventDefault()
                              onCancelEdit()
                            }
                          }}
                          rows={4}
                          placeholder="Corpo do fato"
                          style={{
                            width: '100%',
                            resize: 'vertical',
                            padding: '7px 10px',
                            fontFamily: 'var(--font-ui)',
                            fontSize: 13,
                            lineHeight: 1.5,
                            color: 'var(--text-primary)',
                            background: 'var(--surface)',
                            border: '1px solid var(--border-hairline)',
                            borderRadius: 'var(--radius-sm)',
                            outline: 'none',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <ReviewActionButton
                            label={emAcao.has(c.id) ? 'Salvando…' : 'Salvar'}
                            disabled={busyAll || emAcao.has(c.id)}
                            variant="confirm"
                            onClick={() => void onSaveEdit(c.id, editTitulo, editCorpo)}
                          />
                          <ReviewActionButton
                            label="Cancelar"
                            disabled={busyAll || emAcao.has(c.id)}
                            variant="ghost"
                            onClick={onCancelEdit}
                          />
                        </div>
                      </div>
                    ) : (
                      
                      <>
                        <div
                          onClick={() => toggleAberto(c.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 12px',
                            cursor: 'pointer',
                          }}
                        >
                          {}
                          <Checkbox
                            checked={isSel}
                            disabled={busyAll}
                            onToggle={() => onToggleSel(c.id)}
                            ariaLabel={`Selecionar ${c.titulo || 'fato sem título'}`}
                          />

                          {}
                          <span
                            aria-hidden="true"
                            style={{
                              flex: '0 0 auto',
                              fontSize: 11,
                              color: 'var(--text-tertiary)',
                              transform: isAberto ? 'rotate(90deg)' : 'rotate(0deg)',
                              transition: 'transform 160ms ease',
                            }}
                          >
                            ▸
                          </span>

                          <span
                            style={{
                              flex: '1 1 auto',
                              minWidth: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontFamily: 'var(--font-ui)',
                              fontSize: 13,
                            }}
                          >
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {c.titulo || '(sem título)'}
                            </span>
                            {snippetDoCorpo(c.corpo) && (
                              <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>
                                {' · '}
                                {snippetDoCorpo(c.corpo)}
                              </span>
                            )}
                          </span>

                          {}
                          <div
                            style={{ flex: '0 0 auto', display: 'flex', gap: 6 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ReviewActionButton
                              label="editar"
                              disabled={busyAll}
                              variant="ghost"
                              onClick={() => onStartEdit(c)}
                            />
                            <ReviewActionButton
                              label="aprovar"
                              disabled={busyAll}
                              variant="approve"
                              onClick={() => void onApprove(c.id)}
                            />
                            <ReviewActionButton
                              label="descartar"
                              disabled={busyAll}
                              variant="reject"
                              onClick={() => void onReject(c.id)}
                            />
                          </div>
                        </div>

                        {}
                        {isAberto && (
                          <div
                            style={{
                              padding: '0 12px 12px 44px',
                              fontFamily: 'var(--font-ui)',
                              fontSize: 12.5,
                              color: 'var(--text-secondary)',
                              lineHeight: 1.5,
                              whiteSpace: 'pre-wrap',
                              maxHeight: 220,
                              overflowY: 'auto',
                            }}
                          >
                            {c.corpo}
                          </div>
                        )}
                      </>
                    )}
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        </div>
      )}

      {}
      {reviewErr && <InlineNote tone="error" text={reviewErr} />}

      {}
      {imagensVisiveis.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            paddingTop: 12,
            borderTop: '1px solid var(--border-hairline)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            Imagens deste documento
          </div>
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {imagensVisiveis.map((img) => (
              <ImageQueueRow
                key={img.n}
                img={img}
                url={imgUrls[img.n]}
                busy={imgBusy === img.n}
                reduceMotion={reduceMotion}
                onAcao={onImagemAcao}
              />
            ))}
          </ul>
          {imgErr && <InlineNote tone="error" text={imgErr} />}
        </div>
      )}
    </motion.div>
  )
}



function BatchButton({
  label,
  disabled,
  variant,
  onClick,
}: {
  label: string
  disabled: boolean
  variant: 'wave' | 'approve' | 'ghost'
  onClick: () => void
}) {
  const isWave = variant === 'wave'
  const isApprove = variant === 'approve'
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 600,
        lineHeight: 1,
        borderRadius: 'var(--radius-md)',
        border: isWave ? '1px solid transparent' : '1px solid var(--border-hairline)',
        cursor: disabled ? 'default' : 'pointer',
        background: isWave && !disabled ? WAVE_GRADIENT : 'transparent',
        color: isWave && !disabled ? 'var(--bg-base)' : isApprove ? SUCCESS_VAR : 'var(--text-secondary)',
        opacity: disabled ? 0.6 : 1,
        transition: 'opacity 150ms ease, background 160ms ease, color 160ms ease',
      }}
    >
      {label}
    </button>
  )
}



function ReviewActionButton({
  label,
  disabled,
  variant,
  onClick,
}: {
  label: string
  disabled: boolean
  variant: 'ghost' | 'approve' | 'reject' | 'confirm'
  onClick: () => void
}) {
  const [hover, setHover] = useState(false)

  const colorMap: Record<typeof variant, string> = {
    ghost: 'var(--text-secondary)',
    approve: SUCCESS_VAR,
    reject: ERROR_VAR,
    confirm: 'var(--text-primary)',
  }
  const baseColor = colorMap[variant]

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => !disabled && setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        fontWeight: variant === 'ghost' ? 400 : 600,
        lineHeight: 1,
        borderRadius: 'var(--radius-sm)',
        border: '1px solid',
        borderColor:
          variant === 'ghost'
            ? hover && !disabled
              ? 'var(--text-tertiary)'
              : 'var(--border-hairline)'
            : hover && !disabled
              ? baseColor
              : 'var(--border-hairline)',
        background:
          variant === 'approve' && hover && !disabled
            ? `color-mix(in srgb, ${SUCCESS_VAR} 10%, transparent)`
            : variant === 'reject' && hover && !disabled
              ? `color-mix(in srgb, ${ERROR_VAR} 10%, transparent)`
              : 'transparent',
        color: disabled ? 'var(--text-tertiary)' : hover ? baseColor : 'var(--text-tertiary)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'color 130ms ease, border-color 130ms ease, background 130ms ease, opacity 150ms ease',
      }}
    >
      {label}
    </button>
  )
}






function ImageQueueRow({
  img,
  url,
  busy,
  reduceMotion,
  onAcao,
}: {
  img: ImageQueueItem
  url?: string
  busy: boolean
  reduceMotion: boolean
  onAcao: (n: number, acao: 'ler' | 'descartar') => Promise<void>
}) {
  const origem = img.origin_heading?.trim() || 'documento'

  
  if (img.status === 'read') {
    return (
      <li
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          fontFamily: 'var(--font-ui)',
          fontSize: 12.5,
          color: 'var(--text-tertiary)',
        }}
      >
        <StatusDot tone="done" reduceMotion={reduceMotion} />
        <span>Lida (virou card)</span>
      </li>
    )
  }

  
  if (img.status === 'queued' || img.status === 'reading') {
    return (
      <li
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          fontFamily: 'var(--font-ui)',
          fontSize: 12.5,
          color: 'var(--text-tertiary)',
        }}
      >
        <StatusDot tone="active" reduceMotion={reduceMotion} />
        <span>Lendo…</span>
      </li>
    )
  }

  
  if (img.status === 'failed') {
    return (
      <li
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <ImageThumb url={url} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: '1 1 auto' }}>
          <span
            title={origem}
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 12,
              color: 'var(--text-tertiary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Não consegui ler · {origem}
          </span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <ReviewActionButton
              label={busy ? 'lendo…' : 'Tentar de novo'}
              disabled={busy}
              variant="ghost"
              onClick={() => void onAcao(img.n, 'ler')}
            />
          </div>
        </div>
      </li>
    )
  }

  
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-md)',
        opacity: busy ? 0.6 : 1,
        transition: 'opacity 150ms ease',
      }}
    >
      <ImageThumb url={url} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: '1 1 auto' }}>
        <span
          title={origem}
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12.5,
            color: 'var(--text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {origem}
        </span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <ReviewActionButton
            label={busy ? 'lendo…' : 'Ler esta'}
            disabled={busy}
            variant="approve"
            onClick={() => void onAcao(img.n, 'ler')}
          />
          <ReviewActionButton
            label={busy ? 'descartando…' : 'Descartar'}
            disabled={busy}
            variant="reject"
            onClick={() => void onAcao(img.n, 'descartar')}
          />
        </div>
      </div>
    </li>
  )
}





function ImageThumb({ url }: { url?: string }) {
  const [ampliada, setAmpliada] = useState(false)

  
  useEffect(() => {
    if (!ampliada) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAmpliada(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ampliada])

  if (!url) {
    return (
      <span
        aria-hidden="true"
        style={{
          flex: '0 0 auto',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 72,
          height: 72,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--surface)',
          border: '1px solid var(--border-hairline)',
          color: 'var(--text-tertiary)',
        }}
      >
        <FileGlyph />
      </span>
    )
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Imagem do documento"
        title="Clique para ampliar"
        role="button"
        tabIndex={0}
        onClick={() => setAmpliada(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setAmpliada(true)
          }
        }}
        style={{
          flex: '0 0 auto',
          width: 72,
          height: 72,
          objectFit: 'cover',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-hairline)',
          cursor: 'zoom-in',
        }}
      />
      {ampliada && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Imagem do documento ampliada"
          onClick={() => setAmpliada(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            background: 'rgba(4, 6, 10, 0.86)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            cursor: 'zoom-out',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Imagem do documento ampliada"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '92vw',
              maxHeight: '88vh',
              objectFit: 'contain',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-hairline)',
              boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6)',
              cursor: 'default',
            }}
          />
        </div>
      )}
    </>
  )
}
