'use client'






import { useState } from 'react'
import { adsManagerUrl } from '@/lib/trafego/format'
import type { Veredito } from '@/lib/trafego/veredito'
import { BlocoCard, BlocoVazio } from './BlocoCard'
import { fmtValor, fmtRoas } from './_format'

interface AnuncioNo {
  id: string; nome: string; spend?: number; roas?: number; cpa?: number; ctr?: number
  hookRate?: number; veredito: Veredito; nota?: string; motivo?: string
}
interface ConjuntoNo {
  id: string; nome: string; spend?: number; roas?: number; veredito: Veredito; learning?: string
  anuncios: AnuncioNo[]; motivo?: string
}
export interface DrilldownConfig {
  campanha: { id: string; nome: string; spend?: number; roas?: number; veredito: Veredito; motivo?: string }
  conjuntos: ConjuntoNo[]
  accountId: string
}

const VEREDITO_INFO: Record<Veredito, { label: string; cor: string }> = {
  escalar: { label: 'Escalar', cor: 'var(--approve)' },
  cortar: { label: 'Cortar', cor: 'var(--reject)' },
  observar: { label: 'Observar', cor: 'var(--text-tertiary)' },
  aprendendo: { label: 'Aprendendo', cor: 'rgb(214 158 46)' },
}
const LEARNING_LABEL: Record<string, string> = {
  LEARNING: 'Aprendizado', SUCCESS: 'Aprendido', LEARNING_LIMITED: 'Aprend. limitado', FAIL: 'Reprovado',
}

function Chip({ v }: { v: Veredito }) {
  const info = VEREDITO_INFO[v] ?? VEREDITO_INFO.observar
  return (
    <span
      style={{
        display: 'inline-block', padding: '1px 7px', borderRadius: 'var(--radius-sm)',
        fontSize: 10.5, fontWeight: 600, letterSpacing: '0.02em', whiteSpace: 'nowrap',
        color: info.cor,
        background: `color-mix(in srgb, ${info.cor} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${info.cor} 30%, transparent)`,
      }}
    >
      {info.label}
    </span>
  )
}

function DeepLink({ accountId, level, entityId }: { accountId: string; level: 'campaign' | 'adset' | 'ad'; entityId: string }) {
  return (
    <a
      href={adsManagerUrl({ accountId, level, entityId })}
      target="_blank"
      rel="noopener noreferrer"
      title="Abrir no Gerenciador"
      style={{ fontSize: 12, color: 'var(--text-tertiary)', textDecoration: 'none', flexShrink: 0 }}
    >
      ↗
    </a>
  )
}


function Motivo({ texto, indent = 2 }: { texto: string; indent?: number }) {
  return (
    <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)', fontStyle: 'italic', paddingLeft: indent }}>{texto}</span>
  )
}


function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, fontVariantNumeric: 'tabular-nums' }}>
      <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{label}</span>
      <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500 }}>{value}</span>
    </span>
  )
}

function AnuncioRow({ a, accountId }: { a: AnuncioNo; accountId: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '7px 0 7px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Chip v={a.veredito} />
        <span
          style={{ fontSize: 12.5, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          title={a.nome}
        >
          {a.nome}
        </span>
        <DeepLink accountId={accountId} level="ad" entityId={a.id} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 14px', paddingLeft: 2 }}>
        {a.spend !== undefined && <Metric label="Gasto" value={fmtValor(a.spend, 'brl')} />}
        {a.roas !== undefined && <Metric label="ROAS" value={fmtRoas(a.roas)} />}
        {a.cpa !== undefined && <Metric label="CPA" value={fmtValor(a.cpa, 'brl')} />}
        {a.ctr !== undefined && <Metric label="CTR" value={fmtValor(a.ctr, 'pct')} />}
        {a.hookRate !== undefined && <Metric label="Hook" value={fmtValor(a.hookRate, 'pct')} />}
      </div>
      {a.motivo && <Motivo texto={a.motivo} />}
      {a.nota && (
        <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)', fontStyle: 'italic', paddingLeft: 2 }}>{a.nota}</span>
      )}
    </div>
  )
}

function ConjuntoRow({ c, accountId }: { c: ConjuntoNo; accountId: string }) {
  const [aberto, setAberto] = useState(true)
  const learning = c.learning ? LEARNING_LABEL[c.learning] ?? c.learning : null
  return (
    <div style={{ borderTop: '1px solid var(--border-hairline)' }}>
      {}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 4 }}>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, padding: '8px 0 8px 10px',
            background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'inherit',
          }}
        >
          <span aria-hidden style={{ fontSize: 10, color: 'var(--text-tertiary)', width: 10 }}>{aberto ? '▾' : '▸'}</span>
          <Chip v={c.veredito} />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={c.nome}>
            {c.nome}
          </span>
          {learning && (
            <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{learning}</span>
          )}
          {c.roas !== undefined && <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{fmtRoas(c.roas)}</span>}
          {c.spend !== undefined && <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{fmtValor(c.spend, 'brl')}</span>}
        </button>
        <DeepLink accountId={accountId} level="adset" entityId={c.id} />
      </div>
      {c.motivo && (
        <div style={{ padding: '0 0 6px 28px' }}>
          <Motivo texto={c.motivo} indent={0} />
        </div>
      )}
      {aberto && (
        c.anuncios.length > 0
          ? c.anuncios.map((a, i) => <AnuncioRow key={`${a.id}-${i}`} a={a} accountId={accountId} />)
          : <div style={{ padding: '4px 0 8px 22px', fontSize: 11.5, color: 'var(--text-tertiary)' }}>Sem anúncios no período.</div>
      )}
    </div>
  )
}

export function DrilldownBlock({ bloco }: { bloco: { config: Record<string, unknown>; annotation: string | null } }) {
  const cfg = (bloco.config ?? {}) as Partial<DrilldownConfig>
  const camp = cfg.campanha
  const accountId = typeof cfg.accountId === 'string' ? cfg.accountId : ''
  const conjuntos = Array.isArray(cfg.conjuntos) ? cfg.conjuntos : []

  if (!camp) {
    return (
      <BlocoCard type="drilldown" annotation={bloco.annotation}>
        <BlocoVazio>Sem campanha para detalhar.</BlocoVazio>
      </BlocoCard>
    )
  }

  return (
    <BlocoCard type="drilldown" annotation={bloco.annotation}>
      {}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 6 }}>
        <Chip v={camp.veredito} />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={camp.nome}>
          {camp.nome}
        </span>
        {camp.roas !== undefined && <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{fmtRoas(camp.roas)}</span>}
        {camp.spend !== undefined && <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{fmtValor(camp.spend, 'brl')}</span>}
        <DeepLink accountId={accountId} level="campaign" entityId={camp.id} />
      </div>
      {camp.motivo && (
        <p style={{ margin: '0 0 8px', fontSize: 11.5, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{camp.motivo}</p>
      )}
      {conjuntos.length > 0
        ? conjuntos.map((c, i) => <ConjuntoRow key={`${c.id}-${i}`} c={c} accountId={accountId} />)
        : <BlocoVazio>Sem conjuntos no período.</BlocoVazio>}
    </BlocoCard>
  )
}
