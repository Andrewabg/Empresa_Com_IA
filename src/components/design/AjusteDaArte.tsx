'use client'


import { useState } from 'react'
import { COPY_AJUSTE, MAX_PEDIDO_DE_AJUSTE } from '@/lib/design/copyDoAjuste'

const campo: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-hairline)',
  background: 'var(--surface-elevated)',
  color: 'var(--text-primary)',
  fontSize: 12.5,
  fontFamily: 'inherit',
  resize: 'vertical',
}

function Botao({
  children, onClick, disabled, primario,
}: { children: React.ReactNode; onClick: () => void; disabled?: boolean; primario?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 12px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-hairline)',
        background: primario ? 'var(--surface-elevated)' : 'transparent',
        color: disabled ? 'var(--text-tertiary)' : 'var(--text-secondary)',
        fontSize: 12,
        fontWeight: primario ? 600 : 500,
        cursor: disabled ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

export function AjusteDaArte({
  variacao, ocupado, onRemixar, rotuloDoBotao,
}: {
  
  variacao: number
  ocupado: boolean
  onRemixar: (variacao: number, pedido: string) => void
  
  rotuloDoBotao?: string
}) {
  const [aberto, setAberto] = useState(false)
  const [pedido, setPedido] = useState('')

  if (!aberto) {
    return (
      <div style={{ display: 'flex' }}>
        <Botao onClick={() => setAberto(true)} disabled={ocupado}>
          {rotuloDoBotao ?? COPY_AJUSTE.abrir}
        </Botao>
      </div>
    )
  }

  const limpo = pedido.trim()
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: 12, borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-hairline)', background: 'var(--surface-sunken, transparent)',
      }}
    >
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
          {COPY_AJUSTE.titulo}
        </span>
        <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)', lineHeight: 1.45 }}>
          {COPY_AJUSTE.ajuda}
        </span>
        <textarea
          value={pedido}
          rows={2}
          autoFocus
          maxLength={MAX_PEDIDO_DE_AJUSTE}
          disabled={ocupado}
          placeholder={COPY_AJUSTE.exemplo}
          onChange={(e) => setPedido(e.target.value)}
          style={campo}
        />
      </label>
      <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{COPY_AJUSTE.custo}</span>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Botao
          primario
          disabled={ocupado || !limpo}
          onClick={() => {
            
            
            onRemixar(variacao, limpo)
            setAberto(false)
          }}
        >
          {ocupado ? COPY_AJUSTE.ocupado : COPY_AJUSTE.confirmar}
        </Botao>
        <Botao onClick={() => setAberto(false)} disabled={ocupado}>
          {COPY_AJUSTE.cancelar}
        </Botao>
      </div>
    </div>
  )
}
