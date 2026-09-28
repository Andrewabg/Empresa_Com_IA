'use client'


import Link from 'next/link'

export type JuridicoEmptyVariant = 'no-agent' | 'welcome'

export function JuridicoEmptyState({ variant }: { variant: JuridicoEmptyVariant }) {
  const content: Record<JuridicoEmptyVariant, { eyebrow: string; title: string; body: React.ReactNode }> = {
    'no-agent': {
      eyebrow: 'Jurídico',
      title: 'Contrate o Alan na Loja',
      body: (
        <>
          O Alan ainda não faz parte da sua empresa. Contrate o cargo na{' '}
          <Link href="/loja" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>
            Loja
          </Link>{' '}
          pra ele redigir seus contratos, analisar o que você recebe e cuidar da Ficha Jurídica da casa.
        </>
      ),
    },
    welcome: {
      eyebrow: 'Escritório vazio',
      title: 'Comece pela Ficha Jurídica',
      body: (
        <>
          O Alan vai se apresentar e montar a Ficha Jurídica da empresa — razão social, CNPJ, foro e as
          posturas da casa. Depois é só pedir: um contrato de prestação de serviços, um NDA, ou mande um
          contrato que você recebeu pra ele analisar com semáforo.
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
          maxWidth: 440,
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
