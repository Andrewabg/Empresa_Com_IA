'use client'




import { motion } from 'motion/react'
import { useReducedMotion } from '@/lib/motion'
import { useArtifactUrl } from './useArtifactUrl'

export interface ReferenciaItem {
  id: string     
  titulo: string
}


function ThumbReferencia({ id, titulo }: ReferenciaItem) {
  const url = useArtifactUrl(id)
  const reducedMotion = useReducedMotion() ?? false

  const shimmerStyle: React.CSSProperties = {
    width: 48,
    height: 48,
    flexShrink: 0,
    borderRadius: 'var(--radius-sm)',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border-hairline)',
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 5,
        maxWidth: 72,
      }}
    >
      {url === null ? (
        reducedMotion ? (
          <div aria-hidden style={shimmerStyle} />
        ) : (
          <motion.div
            aria-hidden
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
            style={shimmerStyle}
          />
        )
      ) : (
        <img
          src={url}
          alt={titulo}
          style={{
            width: 48,
            height: 48,
            flexShrink: 0,
            objectFit: 'cover',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-hairline)',
            display: 'block',
          }}
        />
      )}
      <span
        style={{
          fontSize: 10.5,
          lineHeight: 1.3,
          color: 'var(--text-tertiary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 72,
          width: '100%',
        }}
        title={titulo}
      >
        {titulo}
      </span>
    </div>
  )
}


export function ReferenciaTray({ referencias }: { referencias: ReferenciaItem[] }) {
  if (referencias.length === 0) return null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-hairline)',
        background: 'var(--surface)',
      }}
    >
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
        }}
      >
        Referências desta conversa
      </span>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'nowrap',
          gap: 12,
          overflowX: 'auto',
          paddingBottom: 2,
        }}
      >
        {referencias.map((r) => (
          <ThumbReferencia key={r.id} id={r.id} titulo={r.titulo} />
        ))}
      </div>
    </div>
  )
}
