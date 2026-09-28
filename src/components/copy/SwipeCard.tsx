'use client'

import { useState } from 'react'
import type { SwipeView } from '@/lib/estudio/types'

export function SwipeCard({ swipe, onRemover }: { swipe: SwipeView; onRemover?: (id: string) => void }) {
  const [aberto, setAberto] = useState(false)
  const d = swipe.desmontagem ?? {}
  const isConcorrente = swipe.tags.some((t) => t.trim().toLowerCase() === 'concorrente')
  const temDesmontagem = !!(d.porqueFunciona || d.gancho || d.angulo || d.estrutura?.length || d.gatilhos?.length)

  return (
    <li style={{ listStyle: 'none', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-hairline)', background: 'var(--surface)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{swipe.titulo}</span>
          {swipe.fonte && <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>fonte: {swipe.fonte}</span>}
        </div>
        {isConcorrente && (
          <span style={{ flexShrink: 0, padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: 10.5, color: 'var(--reject)', background: 'color-mix(in srgb, var(--reject) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--reject) 26%, transparent)' }}>concorrente</span>
        )}
        {onRemover && (
          <button type="button" onClick={() => onRemover(swipe.id)} aria-label="Remover swipe" title="Remover do swipe file"
            style={{ flexShrink: 0, width: 22, height: 22, display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)', background: 'transparent', color: 'var(--text-tertiary)', fontSize: 13, lineHeight: 1, cursor: 'pointer' }}>×</button>
        )}
      </div>

      {swipe.tags.filter((t) => t.trim().toLowerCase() !== 'concorrente').length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {swipe.tags.filter((t) => t.trim().toLowerCase() !== 'concorrente').map((t, i) => (
            <span key={`${t}-${i}`} style={{ padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: 11.5, color: 'var(--text-secondary)', background: 'var(--surface-elevated)', border: '1px solid var(--border-hairline)' }}>{t}</span>
          ))}
        </div>
      )}

      {temDesmontagem && (
        <button type="button" onClick={() => setAberto((v) => !v)}
          style={{ alignSelf: 'flex-start', padding: 0, background: 'transparent', border: 'none', color: 'var(--text-tertiary)', fontSize: 11.5, cursor: 'pointer' }}>
          {aberto ? '▾ Esconder desmontagem' : '▸ Por que funciona'}
        </button>
      )}
      {aberto && temDesmontagem && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          {d.porqueFunciona && <span><strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Por quê:</strong> {d.porqueFunciona}</span>}
          {d.gancho && <span><strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Gancho:</strong> {d.gancho}</span>}
          {d.angulo && <span><strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Ângulo:</strong> {d.angulo}</span>}
          {(d.gatilhos?.length ?? 0) > 0 && <span><strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Gatilhos:</strong> {d.gatilhos!.join(', ')}</span>}
          {(d.estrutura?.length ?? 0) > 0 && <span><strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Estrutura:</strong> {d.estrutura!.join(' → ')}</span>}
        </div>
      )}
    </li>
  )
}
