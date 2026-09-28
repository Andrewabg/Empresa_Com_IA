'use client'


import Link from 'next/link'
import { useCallback, useState, type CSSProperties } from 'react'
import { AgentWaveAvatar } from '@/components/avatar/AgentWaveAvatar'
import { rotuloChipVivo, type OrgNodeUI } from '@/lib/organograma/orgView'

const chip = (bg: string): CSSProperties => ({
  padding: '2px 8px',
  borderRadius: 999,
  background: bg,
  fontSize: 11,
  color: 'var(--text-secondary)',
  whiteSpace: 'nowrap',
})

const linkAcao: CSSProperties = {
  position: 'relative',
  zIndex: 2,
  fontSize: 12,
  color: 'var(--text-tertiary)',
  textDecoration: 'none',
}

interface OrgNodeCardProps {
  node: OrgNodeUI
  
  isRoot: boolean
  
  orquestrando: boolean
  
  registerRef: (id: string, el: HTMLDivElement | null) => void
}

export function OrgNodeCard({ node, isRoot, orquestrando, registerRef }: OrgNodeCardProps) {
  const [hot, setHot] = useState(false)
  
  
  const stableRef = useCallback(
    (el: HTMLDivElement | null) => registerRef(node.id, el),
    [node.id, registerRef],
  )
  const emFerias = !node.enabled
  const temChips = node.live.running + node.live.needs_approval + node.live.queued > 0
  return (
    <div
      ref={stableRef}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      onFocusCapture={() => setHot(true)}
      onBlurCapture={() => setHot(false)}
      style={{
        position: 'relative',
        width: isRoot ? 236 : 206,
        padding: '18px 14px 12px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-elevated)',
        border: '1px solid',
        borderColor: hot
          ? 'color-mix(in srgb, var(--wave-from) 45%, var(--border-hairline))'
          : 'var(--border-hairline)',
        opacity: emFerias ? 0.55 : 1,
        transform: hot && !emFerias ? 'translateY(-2px)' : 'none',
        transition: 'border-color 160ms ease, transform 160ms ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {}
      <Link
        href={`/agentes?agent=${node.id}`}
        aria-label={`Abrir a ficha de ${node.name}`}
        style={{ position: 'absolute', inset: 0, zIndex: 1, borderRadius: 'inherit' }}
      />
      <AgentWaveAvatar agentId={node.id} size={isRoot ? 64 : 48} lit={node.enabled} active={hot} />
      <div style={{ textAlign: 'center', minWidth: 0, maxWidth: '100%' }}>
        <div
          style={{
            fontSize: 14.5,
            fontWeight: 600,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {node.name}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: 'var(--text-tertiary)',
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {node.role}
        </div>
      </div>

      {emFerias ? (
        <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>de férias</span>
      ) : temChips ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
          {node.live.running > 0 && (
            <span style={chip('#7C5CFF22')}>{rotuloChipVivo('running', node.live.running)}</span>
          )}
          {node.live.needs_approval > 0 && (
            <Link
              href="/aprovacoes"
              style={{
                ...chip('#f5a62333'),
                position: 'relative',
                zIndex: 2,
                textDecoration: 'none',
              }}
            >
              {rotuloChipVivo('needs_approval', node.live.needs_approval)}
            </Link>
          )}
          {node.live.queued > 0 && (
            <span style={chip('#ffffff14')}>{rotuloChipVivo('queued', node.live.queued)}</span>
          )}
        </div>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 2 }}>
        <Link
          href={`/conversa?agent=${node.id}`}
          style={linkAcao}
        >
          Conversar
        </Link>
        <Link
          href={`/agente/${node.id}`}
          aria-label={`Estação de trabalho de ${node.name}`}
          style={linkAcao}
        >
          Estação
        </Link>
        {orquestrando && (
          <a
            href="#planos-vivos"
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              padding: '2px 8px',
              borderRadius: 999,
              border: '1px solid var(--border-hairline)',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: 6,
                background: 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
              }}
            />
            orquestrando
          </a>
        )}
      </div>
    </div>
  )
}
