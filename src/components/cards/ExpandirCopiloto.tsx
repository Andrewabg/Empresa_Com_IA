'use client'


import { useCallback, useEffect, useState } from 'react'
import { chaveDaLargura, larguraDoCopiloto, rotuloDaLargura } from '@/lib/conversa/copiloto-largura'


export function useCopilotoExpandido(cockpit: string): {
  expandido: boolean
  largura: string
  alternar: () => void
} {
  
  
  const [expandido, setExpandido] = useState(false)
  useEffect(() => {
    try {
      setExpandido(localStorage.getItem(chaveDaLargura(cockpit)) === '1')
    } catch {
      
    }
  }, [cockpit])

  const alternar = useCallback(() => {
    setExpandido((atual) => {
      const proximo = !atual
      try {
        localStorage.setItem(chaveDaLargura(cockpit), proximo ? '1' : '0')
      } catch {
        
      }
      return proximo
    })
  }, [cockpit])

  return { expandido, largura: larguraDoCopiloto(expandido), alternar }
}


function SetasIcon({ expandido }: { expandido: boolean }) {
  return expandido ? (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M6 2v4H2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 12V8h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2 6V2h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8v4H8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}


export function ExpandirCopiloto({ expandido, onAlternar }: { expandido: boolean; onAlternar: () => void }) {
  const { label, title } = rotuloDaLargura(expandido)
  return (
    <button
      type="button"
      onClick={onAlternar}
      title={title}
      aria-label={title}
      aria-pressed={expandido}
      style={{
        marginLeft: 'auto',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-hairline)',
        background: 'var(--surface)',
        color: 'var(--text-tertiary)',
        fontFamily: 'var(--font-ui)',
        fontSize: 11.5,
        cursor: 'pointer',
      }}
    >
      <SetasIcon expandido={expandido} />
      <span>{label}</span>
    </button>
  )
}
