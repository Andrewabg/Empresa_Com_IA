'use client'



import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/app/agentes/parts'
import type { TreinoCaso, TreinoCorrecao } from '@/data/treino'
import { Fila } from './parts/Fila'
import { Treinador } from './parts/Treinador'
import { Placar } from './parts/Placar'
import { Aprendizados } from './parts/Aprendizados'
import { ConfigTab } from './parts/config/ConfigTab'
import type { ConfigInicial } from './parts/config/types'

type Aba = 'treino' | 'config'

export function SalaClient({
  agentId,
  agentName,
  initialCasos,
  initialTestes,
  initialCorrecoes,
  isCanal,
  initialConfig,
}: {
  agentId: string
  agentName: string
  initialCasos: TreinoCaso[]
  initialTestes: TreinoCaso[]
  initialCorrecoes: TreinoCorrecao[]
  isCanal: boolean
  initialConfig: ConfigInicial | null
}) {
  const router = useRouter()
  const [aba, setAba] = useState<Aba>('treino')
  const [casos, setCasos] = useState<TreinoCaso[]>(initialCasos)
  const [testes, setTestes] = useState<TreinoCaso[]>(initialTestes)
  const [casoSelecionado, setCasoSelecionado] = useState<TreinoCaso | null>(null)
  const [correcoes, setCorrecoes] = useState<TreinoCorrecao[]>(initialCorrecoes)

  
  
  const abas = isCanal && initialConfig ? (['treino', 'config'] as const) : (['treino'] as const)

  
  
  
  const refrescar = useCallback(async () => {
    try {
      const [resCasos, resCorrecoes] = await Promise.all([
        fetch(`/api/treino/casos?agentId=${encodeURIComponent(agentId)}`),
        fetch(`/api/treino/correcoes?agentId=${encodeURIComponent(agentId)}`),
      ])
      const jCasos = (await resCasos.json().catch(() => ({}))) as {
        casos?: TreinoCaso[]
        testes?: TreinoCaso[]
      }
      const jCorrecoes = (await resCorrecoes.json().catch(() => ({}))) as {
        correcoes?: TreinoCorrecao[]
      }
      if (Array.isArray(jCasos.casos)) setCasos(jCasos.casos)
      if (Array.isArray(jCasos.testes)) setTestes(jCasos.testes)
      if (Array.isArray(jCorrecoes.correcoes)) setCorrecoes(jCorrecoes.correcoes)
      
      
    } catch (e) {
      console.warn('[SalaClient] refrescar falhou:', e)
    }
  }, [agentId])

  const handleCasoCorrigido = useCallback(() => {
    void refrescar()
    
    router.refresh()
  }, [refrescar, router])

  return (
    <div className="treino-sala-page">
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
        <a
          href="/treino"
          style={{
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
            textDecoration: 'none',
          }}
        >
          Sala de Treino
        </a>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>›</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}
        >
          {agentName}
        </span>
        <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginLeft: 2 }}>
          · {testes.length} teste{testes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {}
      <div
        style={{
          flex: '0 0 auto',
          display: 'inline-flex',
          gap: 2,
          padding: '3px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-hairline)',
          background: 'var(--surface-elevated)',
          alignSelf: 'flex-start',
        }}
      >
        {abas.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setAba(t)}
            style={{
              padding: '5px 14px',
              borderRadius: 'calc(var(--radius-sm) - 2px)',
              border: 'none',
              background: aba === t ? 'var(--surface)' : 'transparent',
              color: aba === t ? 'var(--text-primary)' : 'var(--text-tertiary)',
              fontSize: 13,
              fontWeight: aba === t ? 500 : 400,
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {t === 'treino' ? 'Treinar' : 'Configurar e testar'}
          </button>
        ))}
      </div>

      {aba === 'config' && initialConfig ? (
        
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Card label="Configurar e testar o atendente" style={{ flex: 1, minHeight: 0 }}>
            <ConfigTab agentId={agentId} agentName={agentName} initial={initialConfig} />
          </Card>
        </div>
      ) : (
        
        <div className="treino-grid">
          {}
          <Card bodyScroll={false} style={{ overflow: 'hidden' }}>
            <Fila
              casos={casos}
              casoSelecionadoId={casoSelecionado?.id ?? null}
              onSelect={setCasoSelecionado}
            />
          </Card>

          {}
          <div
            className="treino-col-dir"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'clamp(14px, 1.6vw, 20px)',
              minHeight: 0,
              overflowY: 'auto',
            }}
          >
            <Card bodyScroll={false} style={{ flex: '1 0 auto', minHeight: 'clamp(300px, 42vh, 440px)', overflow: 'hidden' }}>
              <Treinador caso={casoSelecionado} onCasoCorrigido={handleCasoCorrigido} />
            </Card>

            <Card bodyScroll={false} style={{ flex: '0 0 auto' }}>
              <Placar agentId={agentId} totalTestes={testes.length} />
            </Card>

            <Card bodyScroll={false} style={{ flex: '0 0 auto' }}>
              <Aprendizados agentId={agentId} initialCorrecoes={correcoes} />
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
