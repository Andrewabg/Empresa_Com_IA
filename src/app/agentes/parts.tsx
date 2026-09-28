import type React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import type { Agent } from './types'
import { AgentWaveAvatar } from '@/components/avatar/AgentWaveAvatar'




export function Toggle({
  id,
  label,
  help,
  checked,
  onChange,
  disabled,
}: {
  id: string
  label: string
  help?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <label
        htmlFor={id}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          cursor: disabled ? 'default' : 'pointer',
          flex: 1,
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}
        >
          {label}
        </span>
        {help && (
          <span style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
            {help}
          </span>
        )}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        style={{
          flexShrink: 0,
          width: 40,
          height: 23,
          padding: 0,
          borderRadius: 99,
          position: 'relative',
          cursor: disabled ? 'not-allowed' : 'pointer',
          border: `1px solid ${checked ? 'rgb(40 224 200 / 0.4)' : 'var(--border-hairline)'}`,
          background: checked
            ? 'linear-gradient(120deg, var(--wave-from), var(--wave-to))'
            : 'var(--surface-elevated)',
          opacity: disabled ? 0.5 : 1,
          transition: 'background 0.18s, border-color 0.18s',
          marginTop: 1,
        }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 19 : 2,
            width: 17,
            height: 17,
            borderRadius: '50%',
            background: checked ? 'var(--bg-base)' : 'var(--text-tertiary)',
            transition: 'left 0.18s',
            boxShadow: '0 1px 2px rgb(0 0 0 / 0.3)',
          }}
        />
      </button>
    </div>
  )
}






export function AgentCard({
  agent,
  effectiveModel,
  selected,
  onSelect,
  conversarHref,
}: {
  agent: Agent
  effectiveModel: string
  selected: boolean
  onSelect: () => void
  
  conversarHref?: string | null
}) {
  
  
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        minWidth: 0,
        background: selected ? 'var(--surface-elevated)' : 'var(--surface)',
        border: `1px solid ${selected ? 'rgb(40 224 200 / 0.32)' : 'var(--border-hairline)'}`,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      {}
      {selected && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: '14%',
            bottom: '14%',
            width: 2.5,
            borderRadius: 3,
            background: 'linear-gradient(to bottom, var(--wave-from), var(--wave-to))',
            boxShadow: '0 0 8px 0 rgba(124,92,255,0.5)',
            zIndex: 1,
          }}
        />
      )}

      {}
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`Selecionar ${agent.name}`}
        style={{
          appearance: 'none',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: 7,
          padding: '13px 15px',
          width: '100%',
          minWidth: 0,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', minWidth: 0 }}>
          <AgentWaveAvatar
            agentId={agent.id}
            size={32}
            lit={agent.enabled}
            active={selected || hovered}
          />
          <span
            style={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-display)',
              fontSize: 15.5,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'var(--text-primary)',
            }}
          >
            {agent.name}
          </span>
          {}
          <span
            title={agent.enabled ? 'ativo' : 'desligado'}
            aria-label={agent.enabled ? 'ativo' : 'desligado'}
            style={{
              flexShrink: 0,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: agent.enabled ? 'var(--approve)' : 'var(--text-tertiary)',
            }}
          />
        </div>

        {}
        <span
          style={{
            width: '100%',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 12.5,
            color: 'var(--text-secondary)',
          }}
        >
          {agent.role}
        </span>

        {}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', minWidth: 0 }}>
          {agent.is_primary && (
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '2px 7px',
                borderRadius: 99,
                backgroundImage: 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                border: '1px solid rgb(40 224 200 / 0.22)',
              }}
            >
              principal
            </span>
          )}
          <code
            title="modelo (fixo nesta versão)"
            style={{
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: 'monospace',
              fontSize: 11.5,
              color: 'var(--text-secondary)',
              background: 'var(--surface)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px 7px',
            }}
          >
            {effectiveModel}
          </code>
        </div>
      </button>

      {}
      {conversarHref && (
        <Link
          href={conversarHref}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '9px 15px',
            borderTop: '1px solid var(--border-hairline)',
            color: 'var(--text-secondary)',
            fontSize: 12.5,
            fontFamily: 'var(--font-ui)',
            textDecoration: 'none',
          }}
        >
          Conversar
        </Link>
      )}
    </div>
  )
}




export function SectionButton({
  label,
  count,
  onClick,
  alert,
  alertTitle,
}: {
  label: string
  count?: React.ReactNode
  onClick: () => void
  
  alert?: boolean
  
  alertTitle?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        width: '100%',
        padding: '15px 16px',
        textAlign: 'left',
        background: 'var(--surface)',
        border: `1px solid ${alert ? 'rgb(214 158 46 / 0.32)' : 'var(--border-hairline)'}`,
        borderRadius: 'var(--radius-lg)',
        cursor: 'pointer',
        color: 'var(--text-primary)',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: 13.5, fontWeight: 500 }}>{label}</span>
        {alert && (
          <span
            title={alertTitle ?? 'Atenção'}
            aria-label={alertTitle ?? 'Atenção'}
            style={{ width: 7, height: 7, flexShrink: 0, borderRadius: '50%', background: 'rgb(214 158 46)' }}
          />
        )}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
        {count !== undefined && count !== null && count !== '' && (
          <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>{count}</span>
        )}
        <span aria-hidden style={{ fontSize: 16, lineHeight: 1, color: 'var(--text-tertiary)' }}>
          ›
        </span>
      </span>
    </button>
  )
}



export function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 12, fontWeight: 500, letterSpacing: '0.04em',
      textTransform: 'uppercase', color: 'var(--text-tertiary)',
    }}>
      {children}
    </span>
  )
}




export function Card({ label, hint, footer, children, bodyScroll = true, style, className, ref }: {
  label?: string
  hint?: string
  footer?: React.ReactNode
  children: React.ReactNode
  bodyScroll?: boolean
  style?: React.CSSProperties
  
  className?: string
  
  ref?: React.Ref<HTMLElement>
}) {
  return (
    <section ref={ref} className={className ? `bento-card ${className}` : 'bento-card'} style={{
      display: 'flex', flexDirection: 'column', minHeight: 0,
      background: 'var(--surface)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      ...style,
    }}>
      {(label || hint) && (
        <header style={{ flex: '0 0 auto', padding: '13px 16px 9px' }}>
          {label && <CardLabel>{label}</CardLabel>}
          {hint && (
            <p style={{ margin: '4px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
              {hint}
            </p>
          )}
        </header>
      )}
      <div
        className={`bento-card-body${bodyScroll ? ' cc-scroll' : ''}`}
        style={{
          flex: '1 1 0', minHeight: 0,
          overflow: bodyScroll ? 'auto' : 'visible',
          padding: '2px 16px 14px',
        }}
      >
        {children}
      </div>
      {footer && (
        <footer style={{ flex: '0 0 auto', padding: '11px 16px', borderTop: '1px solid var(--border-hairline)' }}>
          {footer}
        </footer>
      )}
    </section>
  )
}
