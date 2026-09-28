'use client'



import { useMemo } from 'react'
import { montarFerramentas } from '@/lib/inbox/ferramentas'
import type { ConfigInicial } from './types'

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 9px', borderRadius: 999,
      border: '1px solid var(--border-hairline)', background: 'var(--surface-elevated)',
      fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: '18px', whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

export function PersonaJaEBloco({ initial, agentName }: { initial: ConfigInicial; agentName: string }) {
  const conectadas = useMemo(() => {
    const report = initial.toolkits.map((t) => ({ slug: t.slug, name: t.name, connected: t.connected }))
    return montarFerramentas(initial.baseSnapshot.tools, report).filter((f) => f.ligada && f.connected)
  }, [initial.baseSnapshot.tools, initial.toolkits])

  
  const customLigadas = useMemo(() => {
    const ids = initial.baseSnapshot.tools.custom_tools ?? []
    if (ids.length === 0) return []
    const porId = new Map(initial.customTools.map((c) => [c.id, c.titulo]))
    return ids.map((id) => porId.get(id) ?? id)
  }, [initial.baseSnapshot.tools.custom_tools, initial.customTools])

  const c = initial.contadores

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 12,
      padding: '13px 14px', borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-hairline)', background: 'var(--surface)',
    }}>
      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
          O que {agentName} já é
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          Resumo do estado atual — edite abaixo.
        </span>
      </div>

      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{
          fontSize: 11, fontWeight: 500, letterSpacing: '0.04em',
          textTransform: 'uppercase', color: 'var(--text-tertiary)',
        }}>
          Ferramentas conectadas
        </span>
        {conectadas.length === 0 ? (
          <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
            Nenhuma ferramenta externa conectada.
          </span>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {conectadas.map((f) => <Chip key={f.slug}>{f.name}</Chip>)}
          </div>
        )}
      </div>

      {}
      {customLigadas.length > 0 && (
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>Tools próprias ligadas: </span>
          {customLigadas.join(' · ')}
        </div>
      )}

      {}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <Chip>{c.diretrizes} regras fixas</Chip>
        <Chip>{c.playbooks} playbooks</Chip>
        <Chip>{c.fatos} fatos</Chip>
        <Chip>{c.aprendizados} aprendizados</Chip>
      </div>
    </div>
  )
}
