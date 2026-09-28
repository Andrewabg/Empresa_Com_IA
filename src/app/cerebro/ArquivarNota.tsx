'use client'


import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  CONFIRMAR_ARQUIVAR,
  AVISO_ERRO_AO_ARQUIVAR,
  AVISO_SEM_RESPOSTA_DO_SERVIDOR,
  AVISO_INDICE_ATRASADO,
} from '@/lib/brain/arquivoDeNotas'

type Fase = 'idle' | 'arquivando' | 'arquivada_com_aviso'

const botao: React.CSSProperties = {
  fontFamily: 'var(--font-ui)',
  fontSize: 11.5,
  color: 'var(--text-secondary)',
  background: 'transparent',
  border: '1px solid var(--border-hairline)',
  borderRadius: 'var(--radius-sm)',
  padding: '4px 9px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

export function ArquivarNota({ path }: { path: string }) {
  const router = useRouter()
  const [fase, setFase] = useState<Fase>('idle')
  const [erro, setErro] = useState<string | null>(null)

  async function arquivar() {
    if (!window.confirm(CONFIRMAR_ARQUIVAR)) return
    setFase('arquivando')
    setErro(null)
    try {
      const res = await fetch(`/api/cerebro/nota?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
      const j = (await res.json().catch(() => null)) as { error?: string; indice_atrasado?: true } | null
      if (!res.ok) {
        
        
        setErro(j?.error ?? AVISO_ERRO_AO_ARQUIVAR)
        setFase('idle')
        return
      }
      if (j?.indice_atrasado) {
        
        
        
        setFase('arquivada_com_aviso')
        return
      }
      
      
      router.refresh()
    } catch {
      setErro(AVISO_SEM_RESPOSTA_DO_SERVIDOR)
      setFase('idle')
    }
  }

  if (fase === 'arquivada_com_aviso') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span role="status" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          {AVISO_INDICE_ATRASADO}
        </span>
        <button type="button" onClick={() => router.refresh()} style={botao}>
          Ok
        </button>
      </span>
    )
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        onClick={() => void arquivar()}
        disabled={fase === 'arquivando'}
        title="Mover esta nota para o arquivo"
        style={{ ...botao, opacity: fase === 'arquivando' ? 0.55 : 1, cursor: fase === 'arquivando' ? 'not-allowed' : 'pointer' }}
      >
        {fase === 'arquivando' ? 'Arquivando…' : 'Arquivar'}
      </button>
      {erro && (
        <span role="status" style={{ fontSize: 12, color: 'var(--reject)' }}>
          {erro}
        </span>
      )}
    </span>
  )
}
