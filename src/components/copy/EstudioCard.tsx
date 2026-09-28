





import type { ReactNode } from 'react'

interface EstudioCardProps {
  
  eyebrow: string
  
  headerRight?: ReactNode
  
  footer?: ReactNode
  
  dim?: boolean
  children: ReactNode
}


export function EstudioCard({ eyebrow, headerRight, footer, dim, children }: EstudioCardProps) {
  return (
    <section
      aria-label={eyebrow}
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-hairline)',
        background: 'var(--surface)',
        padding: '16px 18px',
        opacity: dim ? 0.6 : 1,
        transition: 'opacity 160ms ease',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          <WaveMark />
          {eyebrow}
        </span>
        {headerRight}
      </header>

      <div style={{ marginTop: 12 }}>{children}</div>

      {footer && (
        <div
          style={{
            margin: '12px 0 0',
            paddingTop: 12,
            borderTop: '1px solid var(--border-hairline)',
          }}
        >
          {footer}
        </div>
      )}
    </section>
  )
}


export function EstudioVazio({ children }: { children: ReactNode }) {
  return (
    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--text-tertiary)' }}>{children}</p>
  )
}


export function WaveMark() {
  return (
    <svg width="14" height="10" viewBox="0 0 16 12" fill="none" aria-hidden>
      <defs>
        <linearGradient id="estudio-wavemark" x1="0" y1="0" x2="16" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--wave-from)" />
          <stop offset="1" stopColor="var(--wave-to)" />
        </linearGradient>
      </defs>
      <path
        d="M1 6c1.8 0 1.8-3.5 3.6-3.5S6.4 9.5 8 9.5s1.8-7 3.6-7S13.2 6 15 6"
        stroke="url(#estudio-wavemark)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
