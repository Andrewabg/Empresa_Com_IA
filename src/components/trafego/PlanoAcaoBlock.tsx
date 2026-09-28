'use client'






import { adsManagerUrl } from '@/lib/trafego/format'
import { BlocoCard, BlocoVazio } from './BlocoCard'

type VeredictoPlano = 'escalar' | 'cortar' | 'observar'

interface ItemPlano {
  nome: string
  id?: string
  motivo?: string
}
interface BaldePlano {
  veredito: VeredictoPlano
  itens: ItemPlano[]
}
export interface PlanoAcaoConfig {
  baldes: BaldePlano[]
  accountId: string
}


const BALDE_INFO: Record<VeredictoPlano, { label: string; cor: string }> = {
  escalar: { label: 'Escalar', cor: 'var(--approve)' },
  cortar: { label: 'Cortar', cor: 'var(--reject)' },
  observar: { label: 'Observar', cor: 'var(--text-tertiary)' },
}
const ORDEM: VeredictoPlano[] = ['escalar', 'cortar', 'observar']

function DeepLink({ accountId, entityId }: { accountId: string; entityId: string }) {
  return (
    <a
      href={adsManagerUrl({ accountId, level: 'campaign', entityId })}
      target="_blank"
      rel="noopener noreferrer"
      title="Abrir no Gerenciador"
      style={{ fontSize: 11.5, color: 'var(--text-tertiary)', textDecoration: 'none', flexShrink: 0 }}
    >
      ↗
    </a>
  )
}

function ItemRow({ item, accountId }: { item: ItemPlano; accountId: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '6px 0', borderTop: '1px solid var(--border-hairline)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{ fontSize: 12.5, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
          title={item.nome}
        >
          {item.nome}
        </span>
        {item.id && <DeepLink accountId={accountId} entityId={item.id} />}
      </div>
      {item.motivo && (
        <span style={{ fontSize: 11.5, lineHeight: 1.45, color: 'var(--text-tertiary)' }}>{item.motivo}</span>
      )}
    </div>
  )
}

function Balde({ balde, accountId }: { balde: BaldePlano; accountId: string }) {
  const info = BALDE_INFO[balde.veredito]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 6 }}>
        <span
          style={{
            display: 'inline-block', padding: '1px 8px', borderRadius: 'var(--radius-sm)',
            fontSize: 10.5, fontWeight: 600, letterSpacing: '0.02em', whiteSpace: 'nowrap',
            color: info.cor,
            background: `color-mix(in srgb, ${info.cor} 14%, transparent)`,
            border: `1px solid color-mix(in srgb, ${info.cor} 30%, transparent)`,
          }}
        >
          {info.label}
        </span>
        <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{balde.itens.length}</span>
      </div>
      {balde.itens.length > 0 ? (
        balde.itens.map((item, i) => <ItemRow key={`${item.id ?? item.nome}-${i}`} item={item} accountId={accountId} />)
      ) : (
        <span style={{ padding: '6px 0', fontSize: 11.5, color: 'var(--text-tertiary)', fontStyle: 'italic', opacity: 0.7 }}>nenhuma</span>
      )}
    </div>
  )
}

export function PlanoAcaoBlock({ bloco }: { bloco: { config: Record<string, unknown>; annotation: string | null } }) {
  const cfg = (bloco.config ?? {}) as Partial<PlanoAcaoConfig>
  const accountId = typeof cfg.accountId === 'string' ? cfg.accountId : ''
  const baldesCfg = Array.isArray(cfg.baldes) ? cfg.baldes : null

  if (!baldesCfg) {
    return (
      <BlocoCard type="plano" annotation={bloco.annotation}>
        <BlocoVazio>Sem plano de ação para o período.</BlocoVazio>
      </BlocoCard>
    )
  }

  
  const porVeredito = new Map<VeredictoPlano, BaldePlano>()
  for (const b of baldesCfg) {
    if (b && (b.veredito === 'escalar' || b.veredito === 'cortar' || b.veredito === 'observar')) {
      porVeredito.set(b.veredito, { veredito: b.veredito, itens: Array.isArray(b.itens) ? b.itens : [] })
    }
  }

  return (
    <BlocoCard type="plano" annotation={bloco.annotation}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
        {ORDEM.map((v) => (
          <Balde key={v} balde={porVeredito.get(v) ?? { veredito: v, itens: [] }} accountId={accountId} />
        ))}
      </div>
    </BlocoCard>
  )
}
