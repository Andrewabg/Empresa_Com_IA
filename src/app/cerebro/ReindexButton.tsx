'use client'


import { useCallback, useEffect, useState } from 'react'

type Status = 'ocioso' | 'pendente' | 'concluido' | 'falhou'
interface Estado { status: Status; quando?: string; erro?: string }

const BOTAO: React.CSSProperties = {
  appearance: 'none',
  border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
  background: 'transparent',
  color: 'var(--text-secondary)',
  borderRadius: 10,
  padding: '7px 12px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  lineHeight: 1.2,
}

function dataCurta(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function ReindexButton() {
  const [estado, setEstado] = useState<Estado>({ status: 'ocioso' })
  const [enviando, setEnviando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  const ler = useCallback(async () => {
    try {
      const r = await fetch('/api/cerebro/reindex')
      if (r.ok) setEstado((await r.json()) as Estado)
    } catch {
      
    }
  }, [])

  useEffect(() => { void ler() }, [ler])

  
  
  useEffect(() => {
    if (estado.status !== 'pendente') return
    const t = setInterval(() => { void ler() }, 20_000)
    return () => clearInterval(t)
  }, [estado.status, ler])

  const pedir = useCallback(async () => {
    setEnviando(true)
    try {
      const r = await fetch('/api/cerebro/reindex', { method: 'POST' })
      if (r.ok) setEstado((await r.json()) as Estado)
      setConfirmando(false)
    } catch {
      setEstado({ status: 'falhou', erro: 'Não consegui falar com o servidor.' })
    } finally {
      setEnviando(false)
    }
  }, [])

  const pendente = estado.status === 'pendente'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      {confirmando && !pendente ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" style={BOTAO} onClick={() => setConfirmando(false)}>Cancelar</button>
          <button
            type="button"
            style={{ ...BOTAO, color: 'var(--text-primary)', borderColor: 'var(--text-tertiary)' }}
            onClick={() => void pedir()}
            disabled={enviando}
          >
            {enviando ? 'Pedindo…' : 'Reconstruir agora'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          style={{ ...BOTAO, opacity: pendente ? 0.6 : 1, cursor: pendente ? 'default' : 'pointer' }}
          onClick={() => !pendente && setConfirmando(true)}
          disabled={pendente}
        >
          {pendente ? 'Reconstruindo…' : 'Reconstruir índice'}
        </button>
      )}

      {}
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.4, color: 'var(--text-tertiary)', maxWidth: 300, textAlign: 'right' }}>
        {confirmando && !pendente
          ? 'Reprocessa todas as notas com o indexador atual. Consome a sua chave da OpenAI e roda em segundo plano.'
          : pendente
            ? 'Vai rodar no próximo ciclo de manutenção. Pode fechar a página.'
            : estado.status === 'falhou'
              ? `Última tentativa falhou: ${estado.erro}`
              : estado.status === 'concluido'
                ? `Índice reconstruído em ${dataCurta(estado.quando)}.`
                : 'Reprocessa o acervo com o indexador atual.'}
      </p>
    </div>
  )
}
