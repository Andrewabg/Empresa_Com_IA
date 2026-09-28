import { cookies } from 'next/headers'
import { requireOperator } from '@/server/auth/session'
import { costSummary, contarCobrancasMeta } from '@/data/cost'
import { resumoCobranca } from '@/lib/canais/cobrancaMeta'
import { agentName } from '@/lib/brain-nav'
import { carregarNomesDeAgente } from '@/server/aprovacoes/nomesDeAgente'
import { fmtUsd } from '@/lib/chart'
import { SpendChart } from '@/components/cost/SpendChart'
import { Breakdown, type BreakdownRow } from '@/components/cost/Breakdown'
import { Budget } from '@/components/cost/Budget'
import { Skeleton } from '@/components/ui/Skeleton'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { parseUxState } from '@/lib/uxState'
import type { MockCostSummary } from '@/mock/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ state?: string }>
}


const TOOL_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  supabase: 'Supabase',
  composio: 'Composio',
  github: 'GitHub',
}
function toolName(slug: string): string {
  return TOOL_NAMES[slug] ?? slug
}


export const metadata = {
  title: 'Custo',
  description: 'Uso e orçamento da sua empresa de IA.',
}

export default async function CustoPage({ searchParams }: PageProps) {
  const { state } = await searchParams
  const ux = parseUxState(state)
  const loading = ux === 'loading'
  const offline = ux === 'offline'

  
  let cost: MockCostSummary = ZERO_COST
  let costError = false
  
  
  let nomesDeAgente: Record<string, string> = {}
  if (!loading) {
    const cookieStore = await cookies()
    await requireOperator(cookieStore)
    try {
      cost = await costSummary()
    } catch (err) {
      console.error('[CustoPage] costSummary falhou:', err)
      
      costError = true
    }
    nomesDeAgente = await carregarNomesDeAgente()
  }

  
  const view = ux === 'empty' ? ZERO_COST : cost

  const agentRows: BreakdownRow[] = view.topAgents.map((a) => ({
    label: agentName(a.agent, nomesDeAgente),
    usd: a.usd,
  }))
  const toolRows: BreakdownRow[] = view.topTools.map((t) => ({
    label: toolName(t.tool),
    usd: t.usd,
  }))

  const days = view.series.length
  const avgDaily = days > 0 ? view.spentUsd / days : 0
  
  const cobrancas = loading || ux === 'empty' ? [] : await contarCobrancasMeta()

  if (loading) {
    return (
      <div
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: 'clamp(32px, 5vw, 64px) clamp(24px, 5vw, 48px) 96px',
        }}
      >
        <CustoSkeleton />
      </div>
    )
  }

  return (
    <>
      {offline && <OfflineBanner label="Custo em tempo real pausado — mostrando o último fechamento." />}
    <div
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: 'clamp(32px, 5vw, 64px) clamp(24px, 5vw, 48px) 96px',
      }}
    >
      {}
      <header style={{ marginBottom: 'clamp(28px, 4vw, 44px)' }}>
        <p
          style={{
            margin: 0,
            marginBottom: 8,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          Custo
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(24px, 3vw, 32px)',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          O que a empresa gastou
        </h1>

        {}
        <div
          style={{
            marginTop: 'clamp(20px, 2.5vw, 28px)',
            display: 'flex',
            alignItems: 'flex-end',
            gap: 'clamp(28px, 5vw, 56px)',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span
                style={{
                  fontSize: 16,
                  color: 'var(--text-tertiary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                US$
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(40px, 6vw, 56px)',
                  fontWeight: 600,
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                  color: 'var(--text-primary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {fmtUsd(view.spentUsd)}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                marginTop: 10,
                fontSize: 13,
                color: 'var(--text-secondary)',
              }}
            >
              {view.budgetUsd > 0 ? (
                <>
                  estimado neste mês — restam{' '}
                  <span style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    US$ {fmtUsd(view.remainingUsd)}
                  </span>{' '}
                  do limite
                </>
              ) : (
                'estimado neste mês — sem limite definido'
              )}
            </p>
          </div>

          {}
          <div style={{ display: 'flex', gap: 'clamp(24px, 4vw, 40px)' }}>
            <Metric label="Média / dia" value={`US$ ${fmtUsd(avgDaily)}`} />
          </div>
        </div>

        {}
        {costError && (
          <p
            style={{
              margin: 0,
              marginTop: 16,
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}
          >
            Dados de custo temporariamente indisponíveis — mostrando zerado.
          </p>
        )}

        {}
        {cobrancas.length > 0 && (
          <div
            style={{
              marginTop: 20, padding: '12px 14px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-hairline)', background: 'var(--surface-elevated)',
            }}
          >
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
              {resumoCobranca(cobrancas)}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
              Isso não entra no valor acima: quem cobra é a Meta, na fatura do WhatsApp Business.
            </p>
          </div>
        )}
      </header>

      {}
      <Panel>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 18,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            Gasto no tempo
          </p>
          <span
            style={{
              fontSize: 12.5,
              color: 'var(--text-tertiary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            últimos {days} dias
          </span>
        </div>
        <SpendChart series={view.series} />
      </Panel>

      {}
      <div
        style={{
          marginTop: 'clamp(24px, 3vw, 36px)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 'clamp(16px, 2.5vw, 24px)',
          alignItems: 'start',
        }}
      >
        <Panel>
          <Breakdown title="Por agente" rows={agentRows} />
        </Panel>
        <Panel>
          <Breakdown title="Por ferramenta" rows={toolRows} />
        </Panel>
      </div>

      {}
      <div style={{ marginTop: 'clamp(24px, 3vw, 36px)' }}>
        <Panel>
          <Budget
            spentUsd={view.spentUsd}
            budgetUsd={view.budgetUsd}
          />
        </Panel>
      </div>
    </div>
    </>
  )
}


const ZERO_COST: MockCostSummary = {
  budgetUsd: 0,
  spentUsd: 0,
  remainingUsd: 0,
  topAgents: [],
  topTools: [],
  series: [],
}


function CustoSkeleton() {
  return (
    <div aria-label="Carregando custo">
      <header style={{ marginBottom: 'clamp(28px, 4vw, 44px)' }}>
        <Skeleton width={60} height={11} style={{ marginBottom: 16 }} />
        <Skeleton width="44%" height={26} radius="var(--radius-sm)" style={{ marginBottom: 24 }} />
        <Skeleton width="32%" height={52} radius="var(--radius-md)" />
      </header>
      <Panel>
        <Skeleton width={140} height={11} style={{ marginBottom: 18 }} />
        <Skeleton width="100%" height={200} radius="var(--radius-md)" />
      </Panel>
      <div
        style={{
          marginTop: 'clamp(24px, 3vw, 36px)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 'clamp(16px, 2.5vw, 24px)',
        }}
      >
        {[0, 1].map((p) => (
          <Panel key={p}>
            <Skeleton width={110} height={11} style={{ marginBottom: 18 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[0, 1, 2].map((r) => (
                <div key={r}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                    <Skeleton width="40%" height={12} />
                    <Skeleton width={48} height={12} />
                  </div>
                  <Skeleton width="100%" height={5} radius={999} />
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  )
}


function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p
        style={{
          margin: 0,
          marginBottom: 6,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 17,
          color: 'var(--text-primary)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </p>
      {hint && (
        <p
          style={{
            margin: 0,
            marginTop: 3,
            fontSize: 11,
            color: 'var(--text-tertiary)',
          }}
        >
          {hint}
        </p>
      )}
    </div>
  )
}


function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: 'clamp(20px, 2.4vw, 28px)',
      }}
    >
      {children}
    </div>
  )
}
