'use client'


import Link from 'next/link'

export type EstudioEmptyVariant = 'no-agent' | 'welcome'

export function EstudioEmptyState({
  variant,
  agentName = 'Lia',
}: {
  variant: EstudioEmptyVariant
  agentName?: string
}) {
  const content: Record<EstudioEmptyVariant, { eyebrow: string; title: string; body: React.ReactNode }> = {
    'no-agent': {
      eyebrow: 'Copywriter',
      title: `Instale a ${agentName} na Loja`,
      body: (
        <>
          A {agentName} ainda não faz parte da sua empresa. Instale o cargo na{' '}
          <Link href="/loja" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>
            Loja
          </Link>{' '}
          pra ela começar a escrever suas peças e aprender a voz da marca.
        </>
      ),
    },
    welcome: {
      eyebrow: 'Estúdio vazio',
      title: 'Peça sua primeira peça',
      body: (
        <>
          Converse com a {agentName} aqui do lado: peça um anúncio, um reels, uma landing…
          Cada peça nasce aqui no Estúdio — com variações por ângulo e a escolha dela.
        </>
      ),
    },
  }

  const c = content[variant]

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(24px, 5vw, 64px)',
      }}
    >
      <div
        style={{
          maxWidth: 420,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-hairline)',
          background: 'var(--surface)',
          padding: '22px 24px',
        }}
      >
        <span
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
            marginBottom: 10,
          }}
        >
          {c.eyebrow}
        </span>
        <h2
          style={{
            margin: '0 0 8px',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          {c.title}
        </h2>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
          {c.body}
        </p>
      </div>
    </div>
  )
}
