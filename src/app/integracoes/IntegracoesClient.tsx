'use client'


import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { Wave } from '@/components/wave/Wave'
import {
  agruparIntegracoesPorCategoria,
  filtrarIntegracoes,
  type IntegracaoCard as IntegracaoCardModel,
} from '@/lib/integracoes/projecao'
import { IntegracaoCard } from './IntegracaoCard'
import { IntegracaoTile } from './IntegracaoTile'
import { GoogleAdsConexao, type GoogleAdsConexaoProps } from './GoogleAdsConexao'

export interface IntegracoesClientProps {
  items: IntegracaoCardModel[]
  configured: boolean
  
  googleAds: GoogleAdsConexaoProps | null
}

const CAP_CATEGORIA = 12

const GRID_RICO: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
  gap: 'clamp(16px, 2vw, 24px)',
  alignItems: 'stretch',
}
const GRID_COMPACTO: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: 12,
  alignItems: 'stretch',
}

export function IntegracoesClient({ items: initialItems, configured, googleAds }: IntegracoesClientProps) {
  const [items, setItems] = useState<IntegracaoCardModel[]>(initialItems)
  const [q, setQ] = useState('')

  const onMudou = useCallback((slug: string, connected: boolean) => {
    setItems((prev) => prev.map((c) => (c.slug === slug ? { ...c, connected } : c)))
  }, [])

  const filtrados = useMemo(() => filtrarIntegracoes(items, q), [items, q])
  const { conectadas, destaque, categorias } = useMemo(
    () => agruparIntegracoesPorCategoria(filtrados),
    [filtrados],
  )
  const termo = q.trim()
  const temAlgo = conectadas.length > 0 || destaque.length > 0 || categorias.length > 0

  return (
    <div style={{ maxWidth: 1760, margin: '0 auto', padding: '0 clamp(24px, 3vw, 44px) 64px' }}>
      {}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', opacity: 0.4, pointerEvents: 'none' }}>
          <Wave scale="hero" state="idle" amplitude={0} ripples={[]} aria-label="Onda da Awave" />
        </div>
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 75% 65% at 50% 45%, transparent 40%, var(--bg-base) 100%)' }} />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640, padding: 'clamp(24px, 3.5vh, 44px) 0 clamp(16px, 2.5vh, 28px)' }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            Central de Integrações
          </p>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 3vw, 48px)', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.05, color: 'var(--text-primary)' }}>
            Integrações
          </h1>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: 'var(--text-secondary)', maxWidth: 520 }}>
            Tudo que seus funcionários podem plugar. Conecte uma vez, qualquer agente usa.
          </p>
        </div>
      </section>

      {}
      {googleAds && <GoogleAdsConexao {...googleAds} />}

      {}
      {!configured && (
        <div style={{ marginTop: 8, marginBottom: 20, padding: '14px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-hairline)', background: 'var(--surface)', fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
          Configure sua chave Composio em{' '}
          <Link href="/config#acoesExternas" style={{ color: 'var(--text-primary)', textDecoration: 'underline' }}>Configurações</Link>{' '}
          pra descobrir e conectar centenas de ferramentas aos seus agentes.
        </div>
      )}

      {}
      <div style={{ position: 'sticky', top: 0, zIndex: 2, paddingTop: 12, paddingBottom: 12, marginBottom: 12, background: 'linear-gradient(to bottom, var(--bg-base) 72%, transparent)' }}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar integração (Gmail, planilha, WhatsApp…)"
          aria-label="Buscar integração"
          spellCheck={false}
          style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)', padding: '12px 16px', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontSize: 14.5, outline: 'none' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(24px, 3vw, 36px)' }}>
        {conectadas.length > 0 && <FaixaRica titulo="Conectadas" cards={conectadas} onMudou={onMudou} />}
        {destaque.length > 0 && <FaixaRica titulo="Em destaque" cards={destaque} onMudou={onMudou} />}
        {categorias.map((secao) => (
          <FaixaCatalogo key={secao.titulo} titulo={secao.titulo} cards={secao.cards} onMudou={onMudou} semCap={!!termo} />
        ))}

        {!temAlgo && (
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-tertiary)' }}>
            {termo ? `Nada bate com "${termo}".` : 'Nenhuma integração para mostrar ainda.'}
          </p>
        )}
      </div>
    </div>
  )
}

function CabecalhoFaixa({ titulo, count }: { titulo: string; count: number }) {
  return (
    <header style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
      <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
        {titulo}
      </h2>
      <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
        {count} {count === 1 ? 'ferramenta' : 'ferramentas'}
      </span>
    </header>
  )
}

function FaixaRica({ titulo, cards, onMudou }: { titulo: string; cards: IntegracaoCardModel[]; onMudou: (s: string, c: boolean) => void }) {
  return (
    <section>
      <CabecalhoFaixa titulo={titulo} count={cards.length} />
      <div style={GRID_RICO}>
        {cards.map((card) => <IntegracaoCard key={card.slug} card={card} onMudou={onMudou} />)}
      </div>
    </section>
  )
}

function FaixaCatalogo({ titulo, cards, onMudou, semCap }: { titulo: string; cards: IntegracaoCardModel[]; onMudou: (s: string, c: boolean) => void; semCap: boolean }) {
  const [expandido, setExpandido] = useState(false)
  const mostrarTodos = semCap || expandido
  const visiveis = mostrarTodos ? cards : cards.slice(0, CAP_CATEGORIA)
  const ocultos = cards.length - visiveis.length

  return (
    <section>
      <CabecalhoFaixa titulo={titulo} count={cards.length} />
      <div style={GRID_COMPACTO}>
        {visiveis.map((card) => <IntegracaoTile key={card.slug} card={card} onMudou={onMudou} />)}
      </div>
      {!mostrarTodos && ocultos > 0 && (
        <button
          type="button"
          onClick={() => setExpandido(true)}
          style={{ marginTop: 12, padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-hairline)', background: 'var(--surface)', color: 'var(--text-secondary)', fontSize: 12.5, fontFamily: 'var(--font-ui)', cursor: 'pointer' }}
        >
          Ver todas ({ocultos})
        </button>
      )}
    </section>
  )
}
