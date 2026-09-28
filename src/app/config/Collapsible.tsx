'use client'



import { useState } from 'react'

function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 6.5 8 10.5 12 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Collapsible({
  icon,
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  icon?: React.ReactNode
  title: string
  subtitle?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="config-collapsible" data-open={open}>
      <button
        type="button"
        className="config-collapsible__summary"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {icon && <span className="config-collapsible__ico" aria-hidden>{icon}</span>}
        <span className="config-collapsible__title">{title}</span>
        {subtitle && <span className="config-collapsible__sub">{subtitle}</span>}
        <span className="config-collapsible__chev" data-open={open} aria-hidden><Chevron /></span>
      </button>
      <div className="config-collapsible__body" style={{ display: open ? 'block' : 'none' }}>
        {children}
      </div>
    </div>
  )
}
