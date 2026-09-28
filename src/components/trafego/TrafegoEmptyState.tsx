'use client'


import Link from 'next/link'

const AMBER = 'rgb(214 158 46)'

export type TrafegoEmptyVariant = 'no-agent' | 'no-connection' | 'welcome'

export function TrafegoEmptyState({
  variant,
  agentName = 'Rui',
}: {
  variant: TrafegoEmptyVariant
  agentName?: string
}) {
  const amber = variant === 'no-connection'

  const content: Record<TrafegoEmptyVariant, { eyebrow: string; title: string; body: React.ReactNode }> = {
    'no-agent': {
      eyebrow: 'Gestor de Tráfego',
      title: 'Instale o Gestor de Tráfego na Loja',
      body: (
        <>
          O {agentName} ainda não faz parte da sua empresa. Instale o cargo na{' '}
          <Link href="/loja" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>
            Loja
          </Link>{' '}
          pra ele começar a ler o Meta e montar seu painel.
        </>
      ),
    },
    'no-connection': {
      eyebrow: 'Meta Ads',
      title: 'Conecte o Meta Ads',
      body: (
        <>
          Pra o {agentName} ler suas campanhas, conecte o Meta Ads em{' '}
          <Link href="/config" style={{ color: AMBER, textDecoration: 'underline' }}>
            /config
          </Link>
          . Sem isso, o painel fica vazio — nada é inventado.
        </>
      ),
    },
    welcome: {
      eyebrow: 'Painel vazio',
      title: 'Peça pro Rui montar seu painel da semana',
      body: (
        <>
          Converse com o {agentName} aqui do lado: peça os indicadores da semana, o
          funil, as campanhas que mais gastam. Cada bloco aparece no painel conforme
          ele responde.
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
          border: `1px solid ${amber ? 'rgb(214 158 46 / 0.32)' : 'var(--border-hairline)'}`,
          background: amber ? 'rgb(214 158 46 / 0.06)' : 'var(--surface)',
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
            color: amber ? AMBER : 'var(--text-tertiary)',
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
