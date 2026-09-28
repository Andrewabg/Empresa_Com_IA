'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { bus } from '@/mock/bus'
import type { LiveEvent } from '@/mock/types'
import { briefing } from '@/mock/fixtures'
import { LiveFeedItem } from './LiveFeedItem'
import { addEvent, seedFeed } from './feedReducer'
import { EmptyState } from '@/components/ui/EmptyState'
import { fatiaVisivel, rotuloVerMais, PASSO_VER_MAIS, TETO_FEED_AO_VIVO } from '@/lib/cockpit/verMais'
import { Skeleton } from '@/components/ui/Skeleton'


function QuietGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M2 10c2.5 0 2.5-4 5-4s2.5 8 5 8 2.5-4 6-4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}


function buildSeed(now: number): LiveEvent[] {
  const min = 60_000
  return [
    {
      id: 'seed-001',
      type: 'memory',
      label: `${briefing.highlights[0]}`,
      at: now - 47 * min,
    },
    {
      id: 'seed-002',
      type: 'action',
      label: 'Curador priorizou o backlog do sprint — 3 tarefas no topo',
      at: now - 39 * min,
    },
    {
      id: 'seed-003',
      type: 'tool',
      label: 'Finance-agent consultou custos de API (OpenAI + Supabase)',
      at: now - 26 * min,
    },
    {
      id: 'seed-004',
      type: 'memory',
      label: 'Nova memória: perfil do parceiro Nexo Ventures atualizado',
      at: now - 18 * min,
    },
    {
      id: 'seed-005',
      type: 'action',
      label: 'Growth-agent rascunhou campanha Meta Ads para Q2',
      at: now - 9 * min,
    },
  ]
}

interface LiveFeedProps {
  
  seed?: LiveEvent[]
  
  empty?: boolean
  
  loading?: boolean
  
  offline?: boolean
  
  action?: ReactNode
  
  nomesDeAgente?: Record<string, string>
  
  fill?: boolean
}


function FeedRowSkeleton({ divider }: { divider: boolean }) {
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '13px 6px',
        listStyle: 'none',
        borderTop: divider ? '1px solid var(--border-hairline)' : 'none',
      }}
    >
      <Skeleton width={32} height={32} radius="var(--radius-sm)" />
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, marginTop: 2 }}>
        <Skeleton height={13} width="85%" />
        <Skeleton height={10} width="38%" />
      </span>
    </li>
  )
}


export function LiveFeed({ seed, empty = false, loading = false, offline = false, action, fill = false, nomesDeAgente }: LiveFeedProps) {
  
  
  const nowRef = useRef<number>(0)
  if (nowRef.current === 0) nowRef.current = Date.now()
  const now = nowRef.current

  
  
  
  
  
  
  const initialSeed = useMemo(
    () =>
      empty || loading
        ? []
        : seedFeed(seed ?? buildSeed(now)),
    [empty, loading, now, seed],
  )
  
  
  
  
  
  const [events, setEvents] = useState<LiveEvent[]>(initialSeed)
  
  const seededIds = useRef<Set<string>>(new Set(initialSeed.map((e) => e.id)))
  
  
  
  
  
  const [mostrando, setMostrando] = useState(TETO_FEED_AO_VIVO)
  const { visiveis, restantes } = fatiaVisivel(events, mostrando)
  const verMais = rotuloVerMais(restantes)

  useEffect(() => {
    if (offline) return 
    const off = bus.on('live', (e) => {
      setEvents((prev) => addEvent(prev, e))
    })
    return off
  }, [offline])

  return (
    <section
      aria-label="Feed ao vivo"
      style={{
        display: 'flex',
        flexDirection: 'column',
        ...(fill ? { minHeight: 0, height: '100%' } : {}),
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 4,
          flex: 'none',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--text-tertiary)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Ao vivo
        </span>
        {}
        {events.length > 0 && !offline && !loading && (
          <span
            aria-hidden
            title="Em tempo real"
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background:
                'radial-gradient(circle at 30% 30%, var(--wave-from), var(--wave-to))',
              boxShadow: '0 0 6px var(--wave-to)',
            }}
          />
        )}
        {}
        {offline && (
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              letterSpacing: '0.04em',
            }}
          >
            pausado
          </span>
        )}
        {action && <span style={{ marginLeft: 'auto' }}>{action}</span>}
      </header>

      {loading ? (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label="Carregando eventos">
          {Array.from({ length: 4 }).map((_, i) => (
            <FeedRowSkeleton key={i} divider={i !== 0} />
          ))}
        </ul>
      ) : events.length === 0 ? (
        <div style={fill ? { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' } : undefined}>
          <EmptyState
            compact
            icon={<QuietGlyph />}
            headline="Tudo quieto por aqui"
            sub="Quando os agentes agirem, os eventos aparecem aqui em tempo real."
          />
        </div>
      ) : (
        <ul
          
          
          role="status"
          aria-live="polite"
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            ...(fill ? { marginTop: 4 } : {}),
          }}
        >
          <AnimatePresence initial={false}>
            {visiveis.map((e, i) => (
              <LiveFeedItem
                key={e.id}
                event={e}
                now={now}
                instant={seededIds.current.has(e.id)}
                divider={i !== 0}
                nomesDeAgente={nomesDeAgente}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}

      {}
      {verMais && (
        <button
          type="button"
          onClick={() => setMostrando((n) => n + PASSO_VER_MAIS)}
          className="cc-vermais"
        >
          {verMais}
        </button>
      )}
    </section>
  )
}
