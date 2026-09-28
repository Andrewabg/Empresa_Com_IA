'use client'



import { useCallback, useRef, useState } from 'react'
import type { TreinoCorrecao } from '@/data/treino'



const GAVETA_LABEL: Record<TreinoCorrecao['gaveta'], string> = {
  base: 'Conhecimento',
  playbook: 'Como responder',
  diretriz: 'Comportamento',
  persona: 'Personalidade',
  regra: 'Regra de ouro',
}

const GAVETA_COLOR: Record<TreinoCorrecao['gaveta'], string> = {
  base: 'rgb(40 224 200 / 0.18)',
  playbook: 'rgb(40 180 255 / 0.14)',
  diretriz: 'rgb(124 92 255 / 0.14)',
  persona: 'rgb(255 200 50 / 0.14)',
  regra: 'rgb(255 90 90 / 0.14)',
}

const GAVETA_BORDER: Record<TreinoCorrecao['gaveta'], string> = {
  base: 'rgb(40 224 200 / 0.35)',
  playbook: 'rgb(40 180 255 / 0.3)',
  diretriz: 'rgb(124 92 255 / 0.3)',
  persona: 'rgb(255 200 50 / 0.3)',
  regra: 'rgb(255 90 90 / 0.3)',
}



type LinhaEstado = 'idle' | 'desfazendo' | 'erro'

function LinhaCorrecao({
  correcao,
  onDesfazer,
}: {
  correcao: TreinoCorrecao
  onDesfazer: (id: string) => void
}) {
  const [estado, setEstado] = useState<LinhaEstado>('idle')
  const [razao, setRazao] = useState<string | null>(null)

  const desfazer = useCallback(async () => {
    if (estado !== 'idle') return
    setEstado('desfazendo')
    setRazao(null)
    try {
      const res = await fetch('/api/treino/desfazer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correcaoId: correcao.id }),
      })
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; reason?: string }
      if (j.ok) {
        onDesfazer(correcao.id)
      } else {
        setRazao(j.reason ?? 'undo_failed')
        setEstado('erro')
      }
    } catch {
      setRazao('Falha de conexão.')
      setEstado('erro')
    }
  }, [correcao.id, estado, onDesfazer])

  const gaveta = correcao.gaveta as TreinoCorrecao['gaveta']

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 13px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-hairline)',
        background: 'var(--surface-elevated)',
      }}
    >
      {}
      <span
        style={{
          flexShrink: 0,
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: 999,
          border: `1px solid ${GAVETA_BORDER[gaveta] ?? 'var(--border-hairline)'}`,
          background: GAVETA_COLOR[gaveta] ?? 'var(--surface-elevated)',
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--text-secondary)',
          lineHeight: '17px',
          marginTop: 1,
        }}
      >
        {GAVETA_LABEL[gaveta] ?? gaveta}
      </span>

      {}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--text-primary)',
            wordBreak: 'break-word',
          }}
        >
          {correcao.conteudo}
        </p>
        {razao && (
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 11.5,
              color: 'var(--color-reject, var(--reject))',
              lineHeight: 1.4,
            }}
          >
            {razao === 'undo_failed'
              ? 'Não foi possível desfazer.'
              : razao === 'not_found'
                ? 'Correção não encontrada.'
                : razao}
          </p>
        )}
      </div>

      {}
      <button
        type="button"
        onClick={() => void desfazer()}
        disabled={estado !== 'idle'}
        style={{
          flexShrink: 0,
          padding: '3px 10px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-hairline)',
          background: 'transparent',
          color: estado === 'erro' ? 'var(--color-reject, var(--reject))' : 'var(--text-tertiary)',
          fontSize: 12,
          cursor: estado !== 'idle' ? 'not-allowed' : 'pointer',
          opacity: estado === 'desfazendo' ? 0.5 : 1,
          transition: 'opacity 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        {estado === 'desfazendo' ? 'Desfazendo…' : 'Desfazer'}
      </button>
    </div>
  )
}



export function Aprendizados({
  agentId,
  initialCorrecoes,
}: {
  agentId: string
  initialCorrecoes: TreinoCorrecao[]
}) {
  
  
  const [correcoes, setCorrecoes] = useState<TreinoCorrecao[]>(initialCorrecoes)
  const [carregando, setCarregando] = useState(false)
  const [erroMsg, setErroMsg] = useState<string | null>(null)

  
  
  
  const prevInitialRef = useRef<TreinoCorrecao[]>(initialCorrecoes)
  if (prevInitialRef.current !== initialCorrecoes) {
    prevInitialRef.current = initialCorrecoes
    setCorrecoes(initialCorrecoes)
  }

  
  const recarregar = useCallback(async () => {
    setCarregando(true)
    setErroMsg(null)
    try {
      const res = await fetch(`/api/treino/correcoes?agentId=${encodeURIComponent(agentId)}`)
      const j = (await res.json().catch(() => ({}))) as { correcoes?: TreinoCorrecao[] }
      if (Array.isArray(j.correcoes)) setCorrecoes(j.correcoes)
    } catch {
      setErroMsg('Erro ao recarregar. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }, [agentId])

  const removerLinha = useCallback((id: string) => {
    setCorrecoes((prev) => prev.filter((c) => c.id !== id))
  }, [])

  return (
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          O que ela já aprendeu
        </span>
        <button
          type="button"
          onClick={() => void recarregar()}
          disabled={carregando}
          style={{
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-hairline)',
            background: 'transparent',
            color: 'var(--text-tertiary)',
            fontSize: 11.5,
            cursor: carregando ? 'wait' : 'pointer',
            opacity: carregando ? 0.5 : 1,
          }}
        >
          {carregando ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>

      {erroMsg && (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--color-reject, var(--reject))' }}>
          {erroMsg}
        </p>
      )}

      {}
      {correcoes.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
          Nenhum aprendizado ativo ainda. Corrija um caso para começar a ensinar o atendente.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {correcoes.map((c) => (
            <LinhaCorrecao key={c.id} correcao={c} onDesfazer={removerLinha} />
          ))}
        </div>
      )}
    </div>
  )
}
