'use client'


import * as Dialog from '@radix-ui/react-dialog'
import type React from 'react'

export function Modal({
  open,
  onOpenChange,
  title,
  hint,
  children,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgb(0 0 0 / 0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
          }}
        />
        <Dialog.Content
          aria-describedby={undefined}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(560px, calc(100vw - 32px))',
            maxHeight: '82vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 24px 80px rgb(0 0 0 / 0.5)',
            zIndex: 101,
            overflow: 'hidden',
          }}
        >
          <header
            style={{
              flex: '0 0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '14px 18px',
              borderBottom: '1px solid var(--border-hairline)',
            }}
          >
            <Dialog.Title
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'var(--text-primary)',
              }}
            >
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Fechar"
                style={{
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-hairline)',
                  background: 'transparent',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  fontSize: 18,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </Dialog.Close>
          </header>
          <div
            className="cc-scroll"
            style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '16px 18px' }}
          >
            {hint && (
              <p style={{ margin: '0 0 14px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
                {hint}
              </p>
            )}
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
