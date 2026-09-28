'use client'

import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useReducedMotion, springPreset } from '@/lib/motion'
import { MemoryCard, type MemoryCardData } from '@/components/cards/MemoryCard'
import { relativeTime } from '@/components/cards/LiveFeedItem'
import { PARA_META, topFolder, agentName } from '@/lib/brain-nav'
import { noteNodeId, folderNodeId, type PositionedNode } from '@/lib/brain-graph'
import { LerNotaInteira } from '../LerNotaInteira'
import type { MockNote } from '@/mock/types'


export function NodePanel({
  node,
  note,
  notes,
  now,
  onClose,
  onSelect,
}: {
  node: PositionedNode | null
  note: MockNote | null
  notes: MockNote[]
  now: number
  onClose: () => void
  onSelect: (graphNodeId: string) => void
}) {
  const reduced = useReducedMotion() ?? false
  
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (node) closeBtnRef.current?.focus()
  }, [node])

  return (
    <AnimatePresence>
      {node && (
        <motion.aside
          role="dialog"
          aria-label={node.kind === 'note' ? `Memória: ${node.label}` : node.label}
          initial={reduced ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, x: 24 }}
          transition={reduced ? { duration: 0 } : springPreset}
          onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            bottom: 12,
            width: 'min(380px, 88%)',
            zIndex: 6,
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 16px 40px rgb(0 0 0 / 0.5)',
            padding: '18px 18px 16px',
            overflowY: 'auto',
          }}
        >
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              position: 'absolute', top: 12, right: 12, width: 28, height: 28,
              display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-hairline)', background: 'transparent',
              color: 'var(--text-tertiary)', cursor: 'pointer', zIndex: 1,
            }}
          >
            ✕
          </button>

          {node.kind === 'note' && note ? (
            <NotePanelBody node={node} note={note} now={now} />
          ) : node.kind === 'folder' ? (
            <FolderPanelBody node={node} notes={notes} now={now} onSelect={onSelect} />
          ) : (
            <CorePanelBody notes={notes} onSelect={onSelect} />
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  )
}



function NotePanelBody({ node, note, now }: { node: PositionedNode; note: MockNote; now: number }) {
  const data: MemoryCardData = {
    id: note.id,
    kind: 'memory',
    title: note.title,
    snippet: note.snippet,
    path: note.path,
    agent: node.agentLabel ?? 'agente desconhecido',
    at: relativeTime(Date.parse(note.updatedAt), now),
    source: note.source ?? null,
  }
  return (
    <div style={{ paddingRight: 30 }}>
      <PanelEyebrow>Memória</PanelEyebrow>
      <MemoryCard data={data} variant="browser" instant />
      {}
      {note.snippetParcial && <LerNotaInteira path={note.path} alturaMaxima={null} />}
    </div>
  )
}



function FolderPanelBody({
  node,
  notes,
  now,
  onSelect,
}: {
  node: PositionedNode
  notes: MockNote[]
  now: number
  onSelect: (graphNodeId: string) => void
}) {
  const hint = node.folder ? PARA_META[node.folder]?.hint : undefined
  const inFolder = notes
    .filter((n) => topFolder(n.path) === node.folder)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : a.id.localeCompare(b.id)))

  return (
    <div style={{ paddingRight: 30 }}>
      <PanelEyebrow>Pasta</PanelEyebrow>
      <PanelTitle>{node.label}</PanelTitle>
      <PanelSub>
        {inFolder.length} {inFolder.length === 1 ? 'memória' : 'memórias'}
        {hint ? ` · ${hint}` : ''}
      </PanelSub>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
        {inFolder.map((n) => (
          <MemoryRow
            key={n.id}
            title={n.title}
            meta={`${n.author_agent ? agentName(n.author_agent) : 'agente desconhecido'} · ${relativeTime(Date.parse(n.updatedAt), now)}`}
            onClick={() => onSelect(noteNodeId(n.id))}
          />
        ))}
      </div>
    </div>
  )
}



function CorePanelBody({ notes, onSelect }: { notes: MockNote[]; onSelect: (graphNodeId: string) => void }) {
  
  const counts = new Map<string, number>()
  for (const n of notes) {
    const f = topFolder(n.path)
    counts.set(f, (counts.get(f) ?? 0) + 1)
  }
  const folders = [...counts.entries()]

  return (
    <div style={{ paddingRight: 30 }}>
      <PanelEyebrow>Cérebro</PanelEyebrow>
      <PanelTitle>O que a empresa sabe</PanelTitle>
      <PanelSub>
        {notes.length} {notes.length === 1 ? 'memória' : 'memórias'} em {folders.length}{' '}
        {folders.length === 1 ? 'pasta' : 'pastas'} · organizado em PARA, versionado em Git.
      </PanelSub>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
        {folders.map(([folder, count]) => (
          <MemoryRow
            key={folder}
            title={folder}
            meta={`${count} ${count === 1 ? 'memória' : 'memórias'}`}
            onClick={() => onSelect(folderNodeId(folder))}
          />
        ))}
      </div>
    </div>
  )
}



function PanelEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      margin: '0 0 8px', fontSize: 11, fontWeight: 500, letterSpacing: '0.08em',
      textTransform: 'uppercase', color: 'var(--text-tertiary)',
    }}>
      {children}
    </p>
  )
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, lineHeight: 1.2,
      letterSpacing: '-0.01em', color: 'var(--text-primary)', margin: '0 0 6px',
    }}>
      {children}
    </h3>
  )
}

function PanelSub({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)', margin: 0 }}>{children}</p>
}


function MemoryRow({ title, meta, onClick }: { title: string; meta: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="brain-panel-row"
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        background: 'var(--surface)', border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-md)', padding: '11px 13px', cursor: 'pointer',
      }}
    >
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 500, lineHeight: 1.3,
        color: 'var(--text-primary)', marginBottom: 4,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {title}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{meta}</div>
    </button>
  )
}
