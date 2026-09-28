import type { ReactNode } from 'react'

interface EmptyStateProps {
  
  icon?: ReactNode
  
  headline: string
  
  sub?: string
  
  action?: ReactNode
  
  compact?: boolean
}


export function EmptyState({ icon, headline, sub, action, compact = false }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: compact ? '28px 20px' : '48px 24px',
        gap: compact ? 8 : 12,
      }}
    >
      {icon && (
        <div
          aria-hidden
          style={{
            display: 'grid',
            placeItems: 'center',
            width: compact ? 32 : 40,
            height: compact ? 32 : 40,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-hairline)',
            color: 'var(--text-tertiary)',
            marginBottom: compact ? 2 : 4,
          }}
        >
          {icon}
        </div>
      )}
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: compact ? 15 : 17,
          fontWeight: 500,
          color: 'var(--text-secondary)',
          margin: 0,
          letterSpacing: '-0.01em',
        }}
      >
        {headline}
      </p>
      {sub && (
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-tertiary)',
            margin: 0,
            lineHeight: 1.5,
            maxWidth: 320,
          }}
        >
          {sub}
        </p>
      )}
      {action && <div style={{ marginTop: compact ? 4 : 8 }}>{action}</div>}
    </div>
  )
}
