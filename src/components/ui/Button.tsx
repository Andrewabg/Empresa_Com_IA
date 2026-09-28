import { cn } from '@/lib/cn'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'default' | 'ghost' | 'primary' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variantStyles: Record<Variant, React.CSSProperties> = {
  default: {
    background: 'var(--surface-elevated)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-hairline)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid transparent',
  },
  primary: {
    background: 'var(--text-primary)',
    color: 'var(--bg-base)',
    border: '1px solid transparent',
  },
  danger: {
    background: 'transparent',
    color: 'var(--reject)',
    border: '1px solid var(--reject)',
  },
}

const sizeStyles: Record<Size, React.CSSProperties> = {
  sm: { fontSize: 12, padding: '4px 10px', borderRadius: 'var(--radius-sm)' },
  md: { fontSize: 13.5, padding: '7px 14px', borderRadius: 'var(--radius-sm)' },
  lg: { fontSize: 14, padding: '10px 20px', borderRadius: 'var(--radius-md)' },
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  className?: string
}

export function Button({
  variant = 'default',
  size = 'md',
  className,
  style,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'var(--font-ui)',
        fontWeight: 500,
        cursor: 'pointer',
        lineHeight: 1,
        transition: 'opacity 120ms ease',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
    >
      {children}
    </button>
  )
}
