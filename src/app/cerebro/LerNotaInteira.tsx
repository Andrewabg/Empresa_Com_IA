'use client'



import { useState } from 'react'
import { Markdown } from '@/components/markdown/Markdown'
import {
  ABRINDO_A_NOTA,
  CEREBRO_NAO_CONECTADO,
  LER_NOTA_INTEIRA,
  MOSTRAR_SO_O_TRECHO,
  NAO_CONSEGUI_ABRIR,
  SO_O_COMECO_DA_NOTA,
} from '@/lib/brain/leituraDaNota'

type Fase = 'fechado' | 'carregando' | 'aberto' | 'erro'

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

export function LerNotaInteira({
  path,
  
  alturaMaxima = 420,
}: {
  path: string
  alturaMaxima?: number | null
}) {
  const [fase, setFase] = useState<Fase>('fechado')
  
  const [corpo, setCorpo] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function abrir() {
    if (corpo !== null) {
      setFase('aberto')
      return
    }
    setFase('carregando')
    setErro(null)
    try {
      const r = await fetch(`/api/cerebro/nota?path=${encodeURIComponent(path)}`)
      const j = (await r.json().catch(() => null)) as Record<string, unknown> | null
      
      if (j?.needsConfig === true) {
        setErro(CEREBRO_NAO_CONECTADO)
        setFase('erro')
        return
      }
      if (!r.ok || typeof j?.corpo !== 'string') {
        
        setErro(typeof j?.error === 'string' ? j.error : NAO_CONSEGUI_ABRIR)
        setFase('erro')
        return
      }
      setCorpo(j.corpo)
      setFase('aberto')
    } catch {
      setErro(NAO_CONSEGUI_ABRIR)
      setFase('erro')
    }
  }

  const aberto = fase === 'aberto'

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {!aberto && (
          <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{SO_O_COMECO_DA_NOTA}</span>
        )}
        <button
          type="button"
          aria-expanded={aberto}
          disabled={fase === 'carregando'}
          onClick={() => (aberto ? setFase('fechado') : void abrir())}
          style={{ ...botao, opacity: fase === 'carregando' ? 0.55 : 1 }}
        >
          {fase === 'carregando' ? ABRINDO_A_NOTA : aberto ? MOSTRAR_SO_O_TRECHO : LER_NOTA_INTEIRA}
        </button>
      </div>

      {fase === 'erro' && erro && (
        <p role="status" style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
          {erro}
        </p>
      )}

      {aberto && corpo !== null && (
        <div
          style={{
            marginTop: 10,
            padding: '12px 14px',
            background: 'var(--surface)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
            
            
            ...(alturaMaxima === null ? {} : { maxHeight: alturaMaxima, overflowY: 'auto' as const }),
            fontSize: 13,
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
            overflowWrap: 'anywhere',
          }}
        >
          <Markdown>{corpo}</Markdown>
        </div>
      )}
    </div>
  )
}
