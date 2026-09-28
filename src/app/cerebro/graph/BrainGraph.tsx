'use client'

import { useEffect, useMemo, useState } from 'react'
import { buildBrainGraph, layoutGraph, GRAPH_CONST } from '@/lib/brain-graph'
import type { PositionedNode } from '@/lib/brain-graph'
import type { MockNote } from '@/mock/types'
import { useReducedMotion } from '@/lib/motion'
import { breathingOffset, heroNoteId, isFresh, matchingNoteIds, neighborsOf } from '@/lib/brain-graph-view'
import { NodePanel } from './NodePanel'
import { useGraphViewport } from './useGraphViewport'


const R_CORE_GLOW = 92 
const R_CORE = 30 
const R_FOLDER = 16 
const R_NOTE = 9 


function folderRadius(count: number | undefined): number {
  return R_FOLDER + Math.min(((count ?? 1) - 1) * 0.7, 9)
}



const BREATH_AMP_NOTE = 9 
const BREATH_AMP_HUB = 4 
const BREATH_SPEED_HZ = 0.06 


export function BrainGraph({ notes, now, query = '' }: { notes: MockNote[]; now: number; query?: string }) {
  const laid = useMemo(() => layoutGraph(buildBrainGraph(notes)), [notes])
  const H = GRAPH_CONST.VIEW_HALF

  const pos = useMemo(() => new Map(laid.nodes.map((n) => [n.id, n])), [laid])

  
  const reduced = useReducedMotion() ?? false
  const [tMs, setTMs] = useState(0)
  useEffect(() => {
    if (reduced) return
    let raf = 0
    let start = 0
    const tick = (ts: number) => {
      if (!start) start = ts
      setTMs(ts - start)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced])

  
  const hero = useMemo(() => heroNoteId(notes), [notes])

  
  const [activeId, setActiveId] = useState<string | null>(null)
  const model = useMemo(() => ({ nodes: laid.nodes, edges: laid.edges }), [laid])
  const active = activeId ? neighborsOf(model, activeId) : null
  const dim = (id: string) => (active && !active.has(id) ? 0.25 : 1) 
  const edgeLit = (e: { source: string; target: string }) =>
    activeId != null && (e.source === activeId || e.target === activeId)

  
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? laid.nodes.find((n) => n.id === selectedId) ?? null : null
  const notesById = useMemo(() => new Map(notes.map((n) => [n.id, n])), [notes])

  
  const view = useGraphViewport(H)
  
  const effPos = (n: PositionedNode) => view.overrideOf(n.id) ?? { x: n.x, y: n.y }
  
  
  
  const drawnOf = (n: PositionedNode) => {
    const base = view.overrideOf(n.id) ?? { x: n.x, y: n.y }
    if (reduced || view.dragId === n.id) return base
    const b = breathingOffset(
      n.phase,
      tMs,
      n.kind === 'note' ? BREATH_AMP_NOTE : BREATH_AMP_HUB,
      BREATH_SPEED_HZ,
    )
    return { x: base.x + b.x, y: base.y + b.y }
  }

  
  const matches = useMemo(() => matchingNoteIds(notes, query), [notes, query])
  const searching = query.trim().length > 0
  const searchDim = (n: PositionedNode) => {
    if (!searching) return 1
    if (n.kind !== 'note') return 0.5 
    return matches.has(n.noteId!) ? 1 : 0.12 
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 'min(74vh, 720px)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-hairline)',
        
        
        background:
          'radial-gradient(58% 52% at 50% 50%, rgba(124,92,255,0.10), transparent 70%),' +
          'radial-gradient(90% 80% at 50% 50%, rgba(40,224,200,0.035), transparent 62%),' +
          'radial-gradient(140% 120% at 50% 36%, rgb(255 255 255 / 0.018), transparent 64%),' +
          'var(--bg-base)',
        overflow: 'hidden',
      }}
    >
      <svg
        ref={view.svgRef}
        role="group"
        aria-label="Grafo do cérebro — constelação de memórias"
        viewBox={`${-H} ${-H} ${2 * H} ${2 * H}`}
        width="100%"
        height="100%"
        style={{ display: 'block', touchAction: 'none', cursor: view.dragId ? 'grabbing' : 'default' }}
        onClick={() => { if (view.consumeMoved()) return; setSelectedId(null) }}
        onWheel={view.onWheel}
        onPointerDown={view.onPointerDownBackground}
        onPointerMove={view.onPointerMove}
        onPointerUp={view.onPointerUp}
        onPointerCancel={view.onPointerUp}
      >
        <defs>
          {}
          <linearGradient id="brainWave" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--wave-from)" />
            <stop offset="100%" stopColor="var(--wave-to)" />
          </linearGradient>
          {}
          <radialGradient id="brainCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--wave-to)" stopOpacity="0.55" />
            <stop offset="42%" stopColor="var(--wave-from)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--wave-to)" stopOpacity="0" />
          </radialGradient>
          {}
          <radialGradient id="brainCoreDisc" cx="38%" cy="30%" r="80%">
            <stop offset="0%" stopColor="var(--wave-from)" />
            <stop offset="58%" stopColor="var(--wave-to)" />
            <stop offset="100%" stopColor="#4b32b8" />
          </radialGradient>
          {}
          <radialGradient id="brainNodeFill" cx="38%" cy="30%" r="85%">
            <stop offset="0%" stopColor="#23262d" />
            <stop offset="100%" stopColor="#121419" />
          </radialGradient>
          {}
          <radialGradient id="brainHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--wave-from)" stopOpacity="0.55" />
            <stop offset="55%" stopColor="var(--wave-to)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--wave-to)" stopOpacity="0" />
          </radialGradient>
          {}
          <linearGradient id="brainEdge" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--wave-from)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--wave-to)" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {}
        <g transform={`translate(${view.vp.tx} ${view.vp.ty}) scale(${view.vp.scale})`}>
        {}
        <g data-layer="orbits" fill="none" stroke="rgb(255 255 255 / 0.035)" strokeWidth={1}>
          <circle cx={0} cy={0} r={H * 0.34} />
          <circle cx={0} cy={0} r={H * 0.62} />
          <circle cx={0} cy={0} r={H * 0.9} />
        </g>

        <g data-layer="edges" fill="none">
          {laid.edges.map((e, i) => {
            const a = drawnOf(pos.get(e.source)!)
            const b = drawnOf(pos.get(e.target)!)
            const isLey = e.kind === 'leyline'
            const lit = edgeLit(e)
            
            const mx = (a.x + b.x) / 2
            const my = (a.y + b.y) / 2
            const dx = b.x - a.x
            const dy = b.y - a.y
            const cx = mx - dy * 0.14
            const cy = my + dx * 0.14
            const d = `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`
            
            
            const opacity = active ? (lit ? 0.95 : 0.025) : isLey ? 0.07 : 0.42
            const width = lit ? 2.2 : isLey ? 1.1 : 1.3
            const stroke = lit ? 'url(#brainWave)' : isLey ? 'url(#brainWave)' : 'url(#brainEdge)'
            
            
            const synapse = !isLey && (!active || lit)
            const pulseStyle = {
              '--pulse-dur': `${(2.6 + (i % 5) * 0.45).toFixed(2)}s`,
              '--pulse-delay': `${((i * 0.83) % 3).toFixed(2)}s`,
            } as React.CSSProperties
            return (
              <g key={e.id}>
                {lit && (
                  
                  <path d={d} stroke="url(#brainWave)" strokeWidth={6} strokeOpacity={0.16} strokeLinecap="round" />
                )}
                <path d={d} stroke={stroke} strokeWidth={width} strokeOpacity={opacity} strokeLinecap="round" />
                {synapse && (
                  <path
                    d={d}
                    pathLength={1}
                    stroke="url(#brainWave)"
                    strokeWidth={lit ? 3 : 2.4}
                    strokeLinecap="round"
                    className="brain-edge__pulse"
                    style={pulseStyle}
                  />
                )}
              </g>
            )
          })}
        </g>

        {}
        <g data-layer="nodes" className="brain-fade-in">
          {laid.nodes.map((n) => {
            
            const dr = drawnOf(n)
            const off = { x: dr.x - n.x, y: dr.y - n.y }
            
            const grow = searching && n.kind === 'note' && matches.has(n.noteId!) ? 1.22 : 1
            const opacity = Math.min(dim(n.id), searchDim(n))
            return (
              
              <g
                key={n.id}
                transform={grow === 1 ? undefined : `translate(${n.x} ${n.y}) scale(${grow}) translate(${-n.x} ${-n.y})`}
                opacity={opacity}
                style={{ cursor: 'pointer', transition: 'opacity 200ms ease' }}
                tabIndex={0}
                role="button"
                aria-label={ariaLabelFor(n)}
                onPointerEnter={() => setActiveId(n.id)}
                onPointerLeave={() => setActiveId((cur) => (cur === n.id ? null : cur))}
                onFocus={() => setActiveId(n.id)}
                onBlur={() => setActiveId((cur) => (cur === n.id ? null : cur))}
                onPointerDown={(e) => view.onPointerDownNode(e, n.id, dr.x, dr.y)}
                onClick={(e) => { e.stopPropagation(); if (view.consumeMoved()) return; setSelectedId(n.id) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedId(n.id)
                  }
                }}
              >
                <NodeView n={n} dx={off.x} dy={off.y} now={now} hero={hero} active={n.id === activeId} />
              </g>
            )
          })}
        </g>
        </g>
      </svg>

      {}
      <div
        style={{
          position: 'absolute',
          left: 12,
          bottom: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          zIndex: 5,
        }}
      >
        <ZoomButton label="Aproximar" onClick={view.zoomIn}>+</ZoomButton>
        <ZoomButton label="Afastar" onClick={view.zoomOut}>−</ZoomButton>
        <ZoomButton
          label="Recentralizar"
          onClick={() => { view.reset(); setSelectedId(null) }}
        >
          ⤢
        </ZoomButton>
      </div>

      {}
      <NodePanel
        node={selected}
        note={selected?.noteId ? notesById.get(selected.noteId) ?? null : null}
        notes={notes}
        now={now}
        onClose={() => setSelectedId(null)}
        onSelect={(id) => setSelectedId(id)}
      />
    </div>
  )
}


function ZoomButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        width: 30,
        height: 30,
        display: 'grid',
        placeItems: 'center',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-hairline)',
        background: 'var(--surface-elevated)',
        color: 'var(--text-secondary)',
        fontSize: 16,
        lineHeight: 1,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}


function ariaLabelFor(n: PositionedNode): string {
  if (n.kind === 'note') return `Memória: ${n.label} — escrita por ${n.agentLabel}`
  if (n.kind === 'folder') return `Pasta ${n.label}, ${n.count} memórias`
  return 'Cérebro'
}



function NodeView({
  n,
  dx = 0,
  dy = 0,
  now,
  hero,
  active = false,
}: {
  n: PositionedNode
  dx?: number
  dy?: number
  now: number
  hero: string | null
  active?: boolean
}) {
  const x = n.x + dx
  const y = n.y + dy

  if (n.kind === 'core') {
    return (
      <g>
        {}
        <circle cx={x} cy={y} r={R_CORE_GLOW} fill="url(#brainCoreGlow)" />
        {}
        <circle cx={x} cy={y} r={R_CORE + 11} fill="none" stroke="url(#brainWave)" strokeOpacity={0.3} strokeWidth={1.2} />
        {}
        <circle cx={x} cy={y} r={R_CORE} fill="url(#brainCoreDisc)" />
        <text
          x={x}
          y={y + R_CORE_GLOW * 0.5 + 6}
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontSize={16}
          fontWeight={600}
          letterSpacing="0.01em"
          fill="var(--text-primary)"
          stroke="var(--bg-base)"
          strokeWidth={3}
          paintOrder="stroke"
        >
          {n.label}
        </text>
      </g>
    )
  }

  if (n.kind === 'folder') {
    const r = folderRadius(n.count)
    return (
      <g>
        {}
        <circle cx={x} cy={y} r={r + 12} fill="url(#brainHalo)" opacity={0.5} />
        {}
        <circle cx={x} cy={y} r={r} fill="url(#brainNodeFill)" />
        <circle cx={x} cy={y} r={r} fill="none" stroke="url(#brainWave)" strokeOpacity={0.6} strokeWidth={1.5} />
        <text
          x={x}
          y={y + r + 19}
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontSize={13}
          fontWeight={600}
          fill="var(--text-primary)"
          stroke="var(--bg-base)"
          strokeWidth={3}
          paintOrder="stroke"
        >
          {n.label}
          <tspan fill="var(--text-tertiary)" fontWeight={400}> · {n.count}</tspan>
        </text>
      </g>
    )
  }

  
  const fresh = n.updatedAt ? isFresh(Date.parse(n.updatedAt), now) : false
  const isHero = n.noteId != null && n.noteId === hero
  const showHalo = fresh || isHero

  return (
    <g>
      {showHalo && <circle cx={x} cy={y} r={R_NOTE + 9} fill="url(#brainHalo)" opacity={isHero ? 0.8 : 0.55} />}
      {}
      <circle
        cx={x}
        cy={y}
        r={R_NOTE}
        fill="url(#brainNodeFill)"
        stroke={fresh ? undefined : 'rgb(255 255 255 / 0.16)'}
        className={fresh ? 'brain-node__fresh' : undefined}
        strokeWidth={1.2}
      />
      {isHero && (
        <circle className="brain-node__pulse" cx={x} cy={y} r={R_NOTE} fill="none" stroke="url(#brainWave)" strokeWidth={1.4} />
      )}
      {}
      {(active || isHero) && (
        <text
          x={x}
          y={y + R_NOTE + 16}
          textAnchor="middle"
          fontFamily="var(--font-ui)"
          fontSize={11.5}
          fill="var(--text-secondary)"
          stroke="var(--bg-base)"
          strokeWidth={3}
          paintOrder="stroke"
        >
          {truncate(n.label, 28)}
        </text>
      )}
    </g>
  )
}


function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}
