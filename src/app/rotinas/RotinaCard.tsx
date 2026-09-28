'use client'


import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { descreverAgenda, descreverProxima, estadoDaAgenda, rotuloDaRotina } from '@/lib/rotinas/agenda'
import { agendaDaLinha } from './types'
import type { AgenteOpcao, Rotina } from './types'


const VER_RESULTADO_DA_ROTINA = 'veja o que saiu'


const ROTINA_ENCERRADA = 'Chegou ao fim na data que você marcou, como combinado. Para ela voltar a rodar, mude a data de término aqui em Editar.'

interface Props {
  rotina: Rotina
  agentes: AgenteOpcao[]
  tz: string
  agora: string
  ocupada: boolean
  aviso: string | null
  onAlternar: () => void
  onRodar: () => void
  onEditar: () => void
  onApagar: () => void
}

export function RotinaCard({ rotina, agentes, tz, agora, ocupada, aviso, onAlternar, onRodar, onEditar, onApagar }: Props) {
  const [confirmando, setConfirmando] = useState(false)
  const agente = agentes.find((a) => a.id === rotina.agent_id)
  const nomeAgente = agente?.nome ?? rotina.agent_id
  const agenda = agendaDaLinha(rotina)
  const estado = estadoDaAgenda(agenda, rotina.ativa, agora, tz)
  const ativa = rotina.ativa
  const encerrada = estado === 'encerrada'
  const agenteDesligado = agente ? !agente.ativo : false

  return (
    <div
      style={{
        background: 'var(--surface)', border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-md)', padding: '16px 18px',
        display: 'flex', flexDirection: 'column', gap: 10,
        opacity: ativa ? 1 : 0.62,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span
          aria-hidden
          style={{
            width: 7, height: 7, borderRadius: 999, flexShrink: 0, transform: 'translateY(-1px)',
            background: ativa ? 'var(--wave-from)' : 'var(--text-tertiary)',
            ...(ativa ? { animation: 'awave-live-dot 2.4s ease-in-out infinite' } : null),
          }}
        />
        <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 560, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          {rotina.titulo}
        </h3>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>
          {rotuloDaRotina(agenda, rotina.ativa, rotina.proxima_execucao, agora, tz)}
        </span>
      </div>

      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)' }}>
        {nomeAgente} · {descreverAgenda(agenda)}
      </p>

      <p
        style={{
          margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}
      >
        {rotina.pedido}
      </p>

      {encerrada && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>{ROTINA_ENCERRADA}</p>
      )}

      {agenteDesligado && ativa && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>
          {nomeAgente} está desligado no /agentes — a rotina segue no relógio, mas não executa.
        </p>
      )}

      {aviso && <p style={{ margin: 0, fontSize: 12.5, color: 'var(--reject)' }}>{aviso}</p>}

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {}
        {!encerrada && (
          <Button size="sm" variant="ghost" onClick={onAlternar} disabled={ocupada}>
            {ativa ? 'Pausar' : 'Ativar'}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onRodar} disabled={ocupada}>Rodar agora</Button>
        <Button size="sm" variant="ghost" onClick={onEditar} disabled={ocupada}>Editar</Button>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {rotina.ultima_execucao && (
            rotina.ultima_task_id ? (
              <a
                href={`/tarefas?tarefa=${rotina.ultima_task_id}`}
                style={{ fontSize: 11.5, color: 'var(--text-tertiary)', textDecoration: 'underline' }}
              >
                rodou {descreverProxima(rotina.ultima_execucao, agora, tz)}, {VER_RESULTADO_DA_ROTINA}
              </a>
            ) : (
              <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                rodou {descreverProxima(rotina.ultima_execucao, agora, tz)}
              </span>
            )
          )}
          {confirmando ? (
            <>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Apagar?</span>
              <Button size="sm" variant="danger" onClick={onApagar} disabled={ocupada}>Apagar</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmando(false)}>Não</Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setConfirmando(true)} disabled={ocupada}>Apagar</Button>
          )}
        </span>
      </div>
    </div>
  )
}
