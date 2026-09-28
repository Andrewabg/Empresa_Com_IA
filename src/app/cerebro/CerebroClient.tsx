'use client'

import { Suspense, useEffect, useId, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { useReducedMotion, springPreset } from '@/lib/motion'
import { MemoryCard, type MemoryCardData } from '@/components/cards/MemoryCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { relativeTime } from '@/components/cards/LiveFeedItem'
import {
  agentName,
  filterNotes,
  groupByFolder,
  PARA_META,
  type NoteGroup,
} from '@/lib/brain-nav'
import { parseUxState } from '@/lib/uxState'
import { avisoDeNotasIgnoradas } from '@/lib/brain/notasIgnoradas'
import type { MockNote } from '@/mock/types'
import { BrainGraph } from './graph/BrainGraph'
import ImportDropzone from './ImportDropzone'
import ReindexButton from './ReindexButton'
import { EditarNota } from './EditarNota'
import { LerNotaInteira } from './LerNotaInteira'
import { ArquivarNota } from './ArquivarNota'



type View = 'graph' | 'list'
function parseView(raw: string | null): View | null {
  return raw === 'graph' || raw === 'list' ? raw : null
}


export function CerebroClient({
  initialNotes,
  degraded = false,
  podeEditar = false,
  ignorados = [],
}: {
  initialNotes: MockNote[]
  degraded?: boolean
  
  podeEditar?: boolean
  
  ignorados?: string[]
}) {
  
  return (
    <Suspense fallback={null}>
      <Cerebro initialNotes={initialNotes} degraded={degraded} podeEditar={podeEditar} ignorados={ignorados} />
    </Suspense>
  )
}

function Cerebro({ initialNotes, degraded, podeEditar, ignorados }: { initialNotes: MockNote[]; degraded: boolean; podeEditar: boolean; ignorados: string[] }) {
  const reducedMotion = useReducedMotion() ?? false
  const router = useRouter()
  const params = useSearchParams()
  const ux = parseUxState(params.get('state'))
  
  const firstUse = ux === 'empty'
  const loading = ux === 'loading'
  
  const demoOffline = ux === 'offline'
  const showBanner = demoOffline || degraded
  const bannerLabel = degraded
    ? 'Sincronização do Cérebro indisponível — reconecte o GitHub em Configurações.'
    : 'Sincronização do cérebro pausada — mostrando a última versão.'

  
  const [query, setQuery] = useState('')

  
  
  const [now, setNow] = useState<number>(() => Date.parse('2026-06-23T08:00:00Z'))
  useEffect(() => { setNow(Date.now()) }, [])

  
  
  
  const urlView = useMemo(() => parseView(params.get('view')), [params])
  const avisoIgnorados = avisoDeNotasIgnoradas(ignorados)
  const [view, setView] = useState<View>(urlView ?? 'graph')
  useEffect(() => {
    if (urlView) return 
    const stored = parseView(typeof window !== 'undefined' ? localStorage.getItem('cerebro:view') : null)
    if (stored) setView(stored)
  }, [urlView])

  function chooseView(next: View) {
    setView(next)
    try { localStorage.setItem('cerebro:view', next) } catch {}
    const sp = new URLSearchParams(Array.from(params.entries()))
    sp.set('view', next)
    window.history.replaceState(null, '', `?${sp.toString()}`)
  }

  const searchId = useId()

  
  const emptyList = useMemo(() => [] as MockNote[], [])

  
  
  const source = firstUse ? emptyList : initialNotes
  const filtered = useMemo(() => filterNotes(source, query), [source, query])
  const groups = useMemo(() => groupByFolder(filtered), [filtered])

  const total = source.length
  const shown = filtered.length
  const trimmed = query.trim()
  const isSearching = trimmed.length > 0
  const noResults = shown === 0

  return (
    <>
      {showBanner && <OfflineBanner label={bannerLabel} urgent={degraded} />}
      {}
      {avisoIgnorados && <OfflineBanner label={avisoIgnorados} urgent={false} />}
      <div
        style={{
          maxWidth: 920,
          margin: '0 auto',
          padding: 'clamp(32px, 5vw, 64px) clamp(24px, 5vw, 48px) 96px',
        }}
      >
      {}
      <header style={{ marginBottom: 'clamp(24px, 3.5vw, 36px)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                marginBottom: 8,
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}
            >
              Cérebro
            </p>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(24px, 3vw, 32px)',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              O que a empresa sabe
            </h1>
          </div>

          {}
          <ViewToggle value={view} onChange={chooseView} />
        </div>

        {}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
            marginTop: 12,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.55,
              color: 'var(--text-secondary)',
              maxWidth: 440,
            }}
          >
            Cada memória mostra quem a escreveu e quando — proveniência verdadeira.
            Organizado em PARA, versionado em Git.
          </p>
          <ReindexButton />
        </div>
      </header>

      {}
      {!loading && (
        <div style={{ marginBottom: 'clamp(16px, 2vw, 24px)' }}>
          <ImportDropzone onImported={() => router.refresh()} />
        </div>
      )}

      {}
      {!firstUse && !loading && (
      <div style={{ marginBottom: 'clamp(20px, 2.5vw, 28px)' }}>
        <label htmlFor={searchId} style={SR_ONLY}>
          Buscar nas memórias do cérebro
        </label>
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'var(--surface)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-lg)',
            padding: '0 14px',
            transition: 'border-color 140ms ease',
          }}
          className="brain-search"
        >
          <span aria-hidden style={{ color: 'var(--text-tertiary)', display: 'grid', flexShrink: 0 }}>
            <SearchGlyph />
          </span>
          <input
            id={searchId}
            type="search"
            inputMode="search"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar memórias — título, trecho ou caminho…"
            aria-describedby={`${searchId}-count`}
            style={{
              flex: 1,
              minWidth: 0,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-ui)',
              fontSize: 15,
              padding: '14px 0',
            }}
          />
          {isSearching && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpar busca"
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 26,
                height: 26,
                flexShrink: 0,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
              }}
            >
              <ClearGlyph />
            </button>
          )}
        </div>

        {}
        <p
          id={`${searchId}-count`}
          aria-live="polite"
          style={{
            margin: 0,
            marginTop: 10,
            fontSize: 12,
            color: 'var(--text-tertiary)',
            fontVariantNumeric: 'tabular-nums',
            minHeight: 16,
          }}
        >
          {isSearching ? (
            noResults ? (
              <>Nenhuma memória para "{trimmed}".</>
            ) : (
              <>
                <span style={{ color: 'var(--text-secondary)' }}>{shown}</span> de {total}{' '}
                {total === 1 ? 'memória' : 'memórias'} para "{trimmed}"
              </>
            )
          ) : (
            <>
              <span style={{ color: 'var(--text-secondary)' }}>{total}</span>{' '}
              {total === 1 ? 'memória' : 'memórias'} no cérebro
            </>
          )}
        </p>
      </div>
      )}

      {}
      {firstUse ? (
        <FirstUseInvite />
      ) : loading ? (
        <CerebroSkeleton />
      ) : noResults && !isSearching ? (
        
        <FirstUseInvite />
      ) : view === 'graph' ? (
        
        <BrainGraph notes={source} now={now} query={query} />
      ) : noResults ? (
        
        <div
          style={{
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface)',
          }}
        >
          <EmptyState
            icon={<SearchGlyph />}
            headline="Nada encontrado"
            sub={`Nenhuma memória casa com "${trimmed}". Tente outros termos — ou peça ao Nathan para procurar por você.`}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(28px, 3.5vw, 40px)' }}>
          {groups.map((group) => (
            <FolderSection
              key={group.folder}
              group={group}
              now={now}
              reducedMotion={reducedMotion}
              podeEditar={podeEditar}
            />
          ))}
        </div>
      )}
      </div>
    </>
  )
}




function FirstUseInvite() {
  return (
    <div
      style={{
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--surface)',
      }}
    >
      <EmptyState
        icon={<MemorySeedGlyph />}
        headline="O cérebro ainda está em branco"
        sub="Nenhuma memória foi registrada ainda. Fale com o Nathan — toda decisão, perfil e nota que importam passam a viver aqui, com proveniência e histórico."
        action={
          <Link
            href="/conversa"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-primary)',
              textDecoration: 'none',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 14px',
            }}
          >
            Falar com o Nathan
            <span aria-hidden>→</span>
          </Link>
        }
      />
    </div>
  )
}


function MemorySeedGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9 2.6v2M9 13.4v2M2.6 9h2M13.4 9h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}




function CerebroSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(28px, 3.5vw, 40px)' }} aria-label="Carregando memórias">
      {Array.from({ length: 2 }).map((_, s) => (
        <section key={s}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border-hairline)' }}>
            <Skeleton width={15} height={15} radius={3} />
            <Skeleton width={140} height={15} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 2 }).map((__, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                }}
              >
                <Skeleton width="60%" height={15} style={{ marginBottom: 9 }} />
                <SkeletonText lines={2} lineHeight={12} gap={8} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}



function FolderSection({
  group,
  now,
  reducedMotion,
  podeEditar,
}: {
  group: NoteGroup
  now: number
  reducedMotion: boolean
  podeEditar: boolean
}) {
  const meta = PARA_META[group.folder]
  const count = group.notes.length

  return (
    <section aria-label={`Pasta ${group.folder}`}>
      {}
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          marginBottom: 14,
          paddingBottom: 10,
          borderBottom: '1px solid var(--border-hairline)',
        }}
      >
        <span aria-hidden style={{ color: 'var(--text-tertiary)', alignSelf: 'center', display: 'grid' }}>
          <FolderGlyph />
        </span>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          {group.folder}
        </h2>
        <span
          style={{
            fontSize: 11.5,
            color: 'var(--text-tertiary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {count}
        </span>
        {meta && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              color: 'var(--text-tertiary)',
            }}
          >
            {meta.hint}
          </span>
        )}
      </header>

      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <AnimatePresence initial={false}>
          {group.notes.map((note) => (
            <NoteRow key={note.id} note={note} now={now} reducedMotion={reducedMotion} podeEditar={podeEditar} />
          ))}
        </AnimatePresence>
      </div>
    </section>
  )
}



function NoteRow({
  note,
  now,
  reducedMotion,
  podeEditar,
}: {
  note: MockNote
  now: number
  reducedMotion: boolean
  podeEditar: boolean
}) {
  
  
  const [editando, setEditando] = useState(false)

  const data: MemoryCardData = {
    id: note.id,
    kind: 'memory',
    title: note.title,
    snippet: note.snippet,
    path: note.path,
    
    
    agent: note.author_agent ? agentName(note.author_agent) : 'agente desconhecido',
    at: relativeTime(Date.parse(note.updatedAt), now),
    
    source: note.source ?? null,
  }

  if (editando) {
    return (
      <div
        style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 16px',
        }}
      >
        <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono, var(--font-ui))' }}>
          {note.path}
        </p>
        <EditarNota path={note.path} tituloDaLista={note.title} onFechar={() => setEditando(false)} />
      </div>
    )
  }

  
  
  
  return (
    <div>
      <MemoryCard
        data={data}
        variant="browser"
        instant={reducedMotion}
        footerAction={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {podeEditar && (
              <button
                type="button"
                onClick={() => setEditando(true)}
                title="Corrigir o texto desta nota"
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 11.5,
                  color: 'var(--text-secondary)',
                  background: 'transparent',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 9px',
                  cursor: 'pointer',
                }}
              >
                Editar
              </button>
            )}
            {podeEditar && <ArquivarNota path={note.path} />}
            <HistoryHook note={note} reducedMotion={reducedMotion} />
          </span>
        }
      />
      {note.snippetParcial && <LerNotaInteira path={note.path} />}
    </div>
  )
}



function HistoryHook({ note, reducedMotion }: { note: MockNote; reducedMotion: boolean }) {
  const [open, setOpen] = useState(false)
  const popId = useId()

  return (
    <span data-history-hook style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        onClick={() => setOpen((v) => !v)}
        onBlur={(e) => {
          if (!(e.currentTarget.closest('[data-history-hook]')?.contains(e.relatedTarget as Node))) {
            setOpen(false)
          }
        }}
        title="Histórico de versões (em breve)"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontFamily: 'var(--font-ui)',
          fontSize: 11.5,
          color: 'var(--text-secondary)',
          background: 'transparent',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px 9px',
          cursor: 'pointer',
        }}
      >
        <HistoryGlyph />
        ver histórico
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={popId}
            role="dialog"
            aria-label={`Histórico de ${note.title}`}
            initial={reducedMotion ? false : { opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.98 }}
            transition={reducedMotion ? { duration: 0 } : { ...springPreset, stiffness: 320 }}
            style={{
              position: 'absolute',
              right: 0,
              bottom: 'calc(100% + 8px)',
              zIndex: 5,
              width: 248,
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 13px',
              boxShadow: '0 12px 32px rgb(0 0 0 / 0.45), inset 0 1px 0 rgb(255 255 255 / 0.04)',
              textAlign: 'left',
            }}
          >
            <p
              style={{
                margin: 0,
                marginBottom: 8,
                fontSize: 10.5,
                fontWeight: 500,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}
            >
              Histórico git
            </p>
            <code
              style={{
                display: 'block',
                fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                fontSize: 11.5,
                color: 'var(--text-secondary)',
                marginBottom: 8,
                wordBreak: 'break-all',
              }}
            >
              {note.path}
            </code>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
              O log de commits desta memória aparece aqui — quem mudou, quando e
              por quê. <span style={{ color: 'var(--text-secondary)' }}>Em breve.</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}



function ViewToggle({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  const tab = (v: View, glyph: React.ReactNode, label: string) => {
    const selected = value === v
    return (
      <button
        type="button" role="tab" aria-selected={selected}
        onClick={() => onChange(v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 500,
          color: selected ? 'var(--text-primary)' : 'var(--text-tertiary)',
          background: selected ? 'var(--surface-elevated)' : 'transparent',
          border: `1px solid ${selected ? 'var(--border-hairline)' : 'transparent'}`,
          borderRadius: 'var(--radius-sm)', padding: '6px 11px', cursor: 'pointer',
        }}
      >
        {glyph}{label}
      </button>
    )
  }
  return (
    <div role="tablist" aria-label="Vista do cérebro" style={{ display: 'inline-flex', gap: 2, padding: 3, background: 'var(--surface)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)' }}>
      {tab('list', <ListGlyph />, 'Lista')}
      {tab('graph', <GraphGlyph />, 'Grafo')}
    </div>
  )
}



function SearchGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="4.3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10.2 10.2L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function ClearGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function FolderGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M1.8 4.2c0-.66.54-1.2 1.2-1.2h2.7l1.3 1.5h5.2c.66 0 1.2.54 1.2 1.2v5.9c0 .66-.54 1.2-1.2 1.2H3c-.66 0-1.2-.54-1.2-1.2V4.2Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function HistoryGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 3.5a4.5 4.5 0 1 1-4.27 5.9"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path d="M3.4 6.2L3 9.4 6.2 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 5.6V8l1.7 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ListGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M5 4.5h8M5 8h8M5 11.5h8M2.6 4.5h.01M2.6 8h.01M2.6 11.5h.01"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function GraphGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="3.5" cy="11.5" r="1.7" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="12" cy="11.5" r="1.7" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="8" cy="3.8" r="1.7" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 5.2L4.5 10M9 5.2l2.5 4.8M5.2 11.5h5.6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}



const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
}
