'use client'






import { useState } from 'react'

export function GanchosDoRoteiro({ ganchos }: { ganchos: string[] }) {
  const [copiado, setCopiado] = useState<number | null>(null)
  if (!ganchos.length) return null

  const copiar = async (i: number) => {
    try {
      await navigator.clipboard.writeText(ganchos[i]!)
      setCopiado(i)
      window.setTimeout(() => setCopiado((atual) => (atual === i ? null : atual)), 1400)
    } catch {  }
  }

  return (
    <details style={{ marginTop: 2 }}>
      <summary style={{ cursor: 'pointer', fontSize: 11, color: 'var(--text-tertiary)', listStyle: 'none' }}>
        {ganchos.length} aberturas alternativas
      </summary>
      <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {ganchos.map((g, i) => (
          <li
            key={i}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '5px 8px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-hairline)', background: 'var(--surface-elevated)',
            }}
          >
            <span style={{ flex: 1, minWidth: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{g}</span>
            <button
              type="button"
              onClick={() => void copiar(i)}
              aria-label={`Copiar a abertura ${i + 1}`}
              style={{ flexShrink: 0, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 10.5, color: copiado === i ? 'var(--wave-from)' : 'var(--text-tertiary)', padding: 0 }}
            >
              {copiado === i ? 'copiado' : 'copiar'}
            </button>
          </li>
        ))}
      </ul>
    </details>
  )
}
