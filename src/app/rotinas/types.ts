

import type { RotinaRow } from '@/data/rotinas'
import type { AgendaSpec, Frequencia } from '@/lib/rotinas/agenda'

export type Rotina = RotinaRow


export function agendaDaLinha(r: Rotina): AgendaSpec {
  return {
    frequencia: r.frequencia,
    hora: r.hora,
    diaSemana: r.dia_semana,
    diasSemana: r.dias_semana,
    diaMes: r.dia_mes,
    terminaEm: r.termina_em,
  }
}

export interface AgenteOpcao {
  id: string
  nome: string
  ativo: boolean
}


export interface RascunhoRotina {
  agentId: string
  titulo: string
  pedido: string
  
  
  frequencia: Frequencia
  hora: string
  
  diaSemana: number
  
  diasSemana: number[]
  diaMes: number
  
  terminaEm: string
}

export function rascunhoDaRotina(r: Rotina): RascunhoRotina {
  const dias = r.dias_semana?.length ? r.dias_semana : (r.dia_semana == null ? [1] : [r.dia_semana])
  return {
    agentId: r.agent_id,
    titulo: r.titulo,
    pedido: r.pedido,
    frequencia: r.frequencia,
    hora: r.hora,
    diaSemana: dias[0],
    diasSemana: dias,
    diaMes: r.dia_mes ?? 1,
    terminaEm: r.termina_em ?? '',
  }
}


export function agendaDoRascunho(v: RascunhoRotina): AgendaSpec {
  return {
    frequencia: v.frequencia,
    hora: v.hora,
    diaSemana: v.frequencia === 'semanal' ? v.diaSemana : null,
    diasSemana: v.frequencia === 'semanal' ? v.diasSemana : null,
    diaMes: v.frequencia === 'mensal' ? v.diaMes : null,
    terminaEm: v.terminaEm || null,
  }
}
