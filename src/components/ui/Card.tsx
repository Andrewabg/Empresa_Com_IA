import type { HTMLAttributes } from 'react'

type Elevation = 'base' | 'elevated'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: Elevation
  padding?: number | string
}

export function Card({
  elevation = 'base',
  padding = '20px',
  style,
  children,
  ...props
}: CardProps) {
  const bgColor = elevation === 'elevated' ? 'var(--surface-elevated)' : 'var(--surface)'

  return (
    <div
      {...props}
      style={{
        background: bgColor,
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-md)',
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
