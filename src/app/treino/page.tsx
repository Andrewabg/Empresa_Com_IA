
import { cookies } from 'next/headers'
import Link from 'next/link'
import { requireOperator } from '@/server/auth/session'
import { listCanais } from '@/data/canais'
import { listAgents } from '@/data/agents'
import { listarTestes } from '@/data/treino'
import { idsDeAtendentes } from '@/lib/canais/atendentes'
import { AgentWaveAvatar } from '@/components/avatar/AgentWaveAvatar'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Sala de Treino',
  description: 'Corrija os atendentes de WhatsApp por conversa.',
}

export default async function TreinoPage() {
  await requireOperator(await cookies())

  let atendentes: Array<{ id: string; name: string; testesCount: number }> = []
  let hasChannel = false

  try {
    const [canais, agents] = await Promise.all([listCanais(), listAgents()])
    hasChannel = canais.length > 0

    
    
    
    
    const canalAgentIds = idsDeAtendentes(canais)
    const candidatos = agents.filter((a) => !a.is_primary && canalAgentIds.has(a.id))

    atendentes = await Promise.all(
      candidatos.map(async (a) => {
        let testesCount = 0
        try {
          testesCount = (await listarTestes(a.id)).length
        } catch {
          
        }
        return { id: a.id, name: a.name, testesCount }
      }),
    )
  } catch (e) {
    console.warn('[treino] loader fail-open:', e)
  }

  return (
    <div className="treino-index-page">
      {}
      <div
        style={{
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          Sala de Treino
        </span>
        <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
          · Corrija os atendentes por conversa
        </span>
      </div>

      {}
      {!hasChannel ? (
        
        <div
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              maxWidth: 460,
              textAlign: 'center',
              padding: '38px 34px',
              background: 'var(--surface)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 19,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'var(--text-primary)',
              }}
            >
              Nenhum atendente encontrado
            </h1>
            <p
              style={{
                margin: '10px 0 18px',
                fontSize: 13.5,
                lineHeight: 1.6,
                color: 'var(--text-secondary)',
              }}
            >
              Conecte o WhatsApp da empresa no{' '}
              <Link
                href="/config"
                style={{ color: 'var(--wave-from)', textDecoration: 'none' }}
              >
                /config
              </Link>{' '}
              e contrate um atendente na{' '}
              <Link
                href="/loja"
                style={{ color: 'var(--wave-from)', textDecoration: 'none' }}
              >
                Loja
              </Link>
              . Quando a Sofia ou o Davi tiverem um canal, o treino aparece aqui.
            </p>
            <Link
              href="/config"
              style={{
                display: 'inline-block',
                padding: '7px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: 13,
                textDecoration: 'none',
              }}
            >
              Abrir configurações →
            </Link>
          </div>
        </div>
      ) : atendentes.length === 0 ? (
        
        <div
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              maxWidth: 460,
              textAlign: 'center',
              padding: '38px 34px',
              background: 'var(--surface)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 19,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'var(--text-primary)',
              }}
            >
              Canal sem atendente vinculado
            </h1>
            <p
              style={{
                margin: '10px 0 18px',
                fontSize: 13.5,
                lineHeight: 1.6,
                color: 'var(--text-secondary)',
              }}
            >
              Há um canal conectado, mas nenhum atendente está vinculado a ele. Contrate
              um atendente na{' '}
              <Link
                href="/loja"
                style={{ color: 'var(--wave-from)', textDecoration: 'none' }}
              >
                Loja
              </Link>{' '}
              e ele aparece aqui pronto para treinar.
            </p>
            <Link
              href="/loja"
              style={{
                display: 'inline-block',
                padding: '7px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: 13,
                textDecoration: 'none',
              }}
            >
              Ir para a Loja →
            </Link>
          </div>
        </div>
      ) : (
        
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 'clamp(14px, 1.6vw, 20px)',
            alignContent: 'start',
          }}
        >
          {atendentes.map((a) => (
            <AtenenteCard key={a.id} atendente={a} />
          ))}
        </div>
      )}
    </div>
  )
}

function AtenenteCard({
  atendente,
}: {
  atendente: { id: string; name: string; testesCount: number }
}) {
  return (
    <Link
      href={`/treino/${encodeURIComponent(atendente.id)}`}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div
        className="treino-atendente-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '18px 20px',
        }}
      >
        <AgentWaveAvatar agentId={atendente.id} size={48} lit={true} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.01em',
            }}
          >
            {atendente.name}
          </p>
          <p
            style={{
              margin: '3px 0 0',
              fontSize: 12.5,
              color: 'var(--text-tertiary)',
            }}
          >
            {atendente.testesCount === 0
              ? 'Nenhum teste guardado ainda'
              : `${atendente.testesCount} teste${atendente.testesCount > 1 ? 's' : ''} guardado${atendente.testesCount > 1 ? 's' : ''}`}
          </p>
        </div>
        <span
          aria-hidden
          style={{
            flexShrink: 0,
            fontSize: 16,
            color: 'var(--text-tertiary)',
          }}
        >
          →
        </span>
      </div>
    </Link>
  )
}
