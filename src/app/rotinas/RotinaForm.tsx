'use client'


import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import {
  alternarDiaSemana, dataLocalDe, descreverAgenda, descreverProxima, proximaExecucaoAte,
  validarAgenda, SEM_EXECUCAO_ATE_O_TERMINO,
} from '@/lib/rotinas/agenda'
import { PEDIDO_MAX } from '@/lib/rotinas/entrada'
import { agendaDoRascunho, type AgenteOpcao, type RascunhoRotina } from './types'

const DIAS_SEMANA = [
  { v: 1, label: 'seg' }, { v: 2, label: 'ter' }, { v: 3, label: 'qua' },
  { v: 4, label: 'qui' }, { v: 5, label: 'sex' }, { v: 6, label: 'sáb' }, { v: 0, label: 'dom' },
]


const FREQ_OPCOES = [
  { v: 'diaria', label: 'Todo dia' },
  { v: 'dias_uteis', label: 'Todo dia útil (segunda a sexta)' },
  { v: 'semanal', label: 'Toda semana' },
  { v: 'mensal', label: 'Todo mês' },
] as const


const AVISO_DO_TERMINO = 'Depois desse dia a rotina para sozinha e fica marcada como encerrada aqui.'

const rotulo: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 7,
}

const campo: React.CSSProperties = {
  width: '100%', padding: '9px 11px', fontFamily: 'var(--font-ui)', fontSize: 13.5,
  color: 'var(--text-primary)', background: 'var(--surface)',
  border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)',
}

interface Props {
  agentes: AgenteOpcao[]
  tz: string
  agora: string
  valor: RascunhoRotina
  editando: boolean
  salvando: boolean
  erro: string | null
  onCancelar: () => void
  onSalvar: (v: RascunhoRotina) => void
}

export function RotinaForm({ agentes, tz, agora, valor, editando, salvando, erro, onCancelar, onSalvar }: Props) {
  const [v, setV] = useState<RascunhoRotina>(valor)
  const set = <K extends keyof RascunhoRotina>(k: K, novo: RascunhoRotina[K]) => setV((old) => ({ ...old, [k]: novo }))

  const agenda = agendaDoRascunho(v)

  
  const alternarDia = (dia: number) =>
    setV((old) => {
      const lista = alternarDiaSemana(old.diasSemana, dia)
      return { ...old, diasSemana: lista, diaSemana: lista[0] }
    })

  
  
  
  const espelho = useMemo(() => {
    if (!validarAgenda(agenda).ok) return { frase: null, semExecucao: false }
    try {
      const prox = proximaExecucaoAte(agenda, agora, tz)
      if (prox === null) return { frase: null, semExecucao: true }
      return { frase: `${descreverAgenda(agenda)} · primeira vez ${descreverProxima(prox, agora, tz)}`, semExecucao: false }
    } catch {
      return { frase: null, semExecucao: false }
    }
  }, [agenda.frequencia, agenda.hora, agenda.diaSemana, agenda.diasSemana?.join(','), agenda.diaMes, agenda.terminaEm, agora, tz]) // eslint-disable-line react-hooks/exhaustive-deps

  const podeSalvar = v.pedido.trim().length > 0 && v.agentId !== '' && validarAgenda(agenda).ok
    && !espelho.semExecucao && !salvando

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (podeSalvar) onSalvar(v) }}
      style={{
        background: 'var(--surface-elevated)', border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 18,
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.6fr)', gap: 16 }}>
        <div>
          <label style={rotulo} htmlFor="rotina-quem">Quem faz</label>
          <select id="rotina-quem" style={campo} value={v.agentId} onChange={(e) => set('agentId', e.target.value)}>
            {agentes.map((a) => (
              <option key={a.id} value={a.id}>{a.nome}{a.ativo ? '' : ' (desligado)'}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={rotulo} htmlFor="rotina-titulo">Nome da rotina <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(opcional)</span></label>
          <input
            id="rotina-titulo" style={campo} value={v.titulo} maxLength={80}
            placeholder="Relatório da semana"
            onChange={(e) => set('titulo', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label style={rotulo} htmlFor="rotina-pedido">O que deve ser feito</label>
        <textarea
          id="rotina-pedido" style={{ ...campo, minHeight: 84, resize: 'vertical', lineHeight: 1.55 }}
          value={v.pedido} maxLength={PEDIDO_MAX}
          placeholder="Peça como pediria a um funcionário. Ex.: gere o relatório de mídia paga da semana e me diga o que mudar."
          onChange={(e) => set('pedido', e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 150 }}>
          <label style={rotulo} htmlFor="rotina-freq">Com que frequência</label>
          <select
            id="rotina-freq" style={campo} value={v.frequencia}
            onChange={(e) => set('frequencia', e.target.value as RascunhoRotina['frequencia'])}
          >
            {FREQ_OPCOES.map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}
          </select>
        </div>

        {v.frequencia === 'semanal' && (
          <div>
            <span style={rotulo}>Nos dias</span>
            <div role="group" aria-label="Dias da semana" style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {DIAS_SEMANA.map((d) => {
                const marcado = v.diasSemana.includes(d.v)
                return (
                  <button
                    key={d.v}
                    type="button"
                    aria-pressed={marcado}
                    onClick={() => alternarDia(d.v)}
                    style={{
                      padding: '8px 11px', fontFamily: 'var(--font-ui)', fontSize: 12.5, cursor: 'pointer',
                      color: marcado ? 'var(--text-primary)' : 'var(--text-tertiary)',
                      background: marcado ? 'var(--surface-elevated)' : 'transparent',
                      border: `1px solid ${marcado ? 'var(--wave-from)' : 'var(--border-hairline)'}`,
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {d.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {v.frequencia === 'mensal' && (
          <div style={{ minWidth: 110 }}>
            <label style={rotulo} htmlFor="rotina-dia-mes">No dia</label>
            <select id="rotina-dia-mes" style={campo} value={v.diaMes} onChange={(e) => set('diaMes', Number(e.target.value))}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        )}

        <div style={{ minWidth: 110 }}>
          <label style={rotulo} htmlFor="rotina-hora">Às</label>
          <input id="rotina-hora" type="time" style={campo} value={v.hora} onChange={(e) => set('hora', e.target.value)} />
        </div>

        <div style={{ minWidth: 160 }}>
          <label style={rotulo} htmlFor="rotina-termina">
            Até <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(opcional)</span>
          </label>
          {}
          <input
            id="rotina-termina" type="date" style={campo} value={v.terminaEm}
            min={dataLocalDe(agora, tz)}
            onChange={(e) => set('terminaEm', e.target.value)}
          />
        </div>
      </div>

      {v.terminaEm && (
        <p style={{ margin: '-8px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>{AVISO_DO_TERMINO}</p>
      )}

      {espelho.frase && (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--wave-from)' }}>↻</span> {espelho.frase}
        </p>
      )}

      {espelho.semExecucao && (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--reject)' }}>{SEM_EXECUCAO_ATE_O_TERMINO}</p>
      )}

      {erro && (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--reject)' }}>{erro}</p>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border-hairline)', paddingTop: 14 }}>
        <Button type="button" variant="ghost" onClick={onCancelar}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={!podeSalvar}>
          {salvando ? 'Salvando…' : editando ? 'Salvar mudanças' : 'Criar rotina'}
        </Button>
      </div>
    </form>
  )
}
