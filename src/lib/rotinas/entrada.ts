


import { FREQUENCIAS, validarAgenda, type AgendaSpec, type Frequencia } from './agenda'
import { encurtarTitulo } from '@/lib/encurtarTitulo'

export const TITULO_MAX = 80
export const PEDIDO_MAX = 2000

export interface EntradaRotina {
  agentId: string
  titulo: string
  pedido: string
  agenda: AgendaSpec
  ativa: boolean
}

export type Resultado =
  | { ok: true; valor: EntradaRotina }
  | { ok: false; erro: string }


export function tituloDoPedido(pedido: string): string {
  const limpo = pedido.trim().replace(/\s+/g, ' ')
  const corte = limpo.split(/(?<=[.!?])\s/)[0] ?? limpo
  const base = encurtarTitulo(corte, TITULO_MAX) 
  return base.replace(/[.!?]+$/, '')
}

function texto(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}


function inteiro(v: unknown): number | null {
  if (typeof v === 'number' && Number.isInteger(v)) return v
  if (typeof v === 'string' && /^-?\d+$/.test(v.trim())) return Number(v.trim())
  return null
}


function listaDeDias(v: unknown): number[] | null {
  if (!Array.isArray(v)) return null
  const dias = v.map(inteiro).filter((d): d is number => d !== null)
  return dias.length ? dias : null
}

export function normalizarEntrada(raw: Record<string, unknown>): Resultado {
  const agentId = texto(raw.agentId)
  if (!agentId) return { ok: false, erro: 'Escolha quem vai executar a rotina.' }

  const pedido = texto(raw.pedido)
  if (!pedido) return { ok: false, erro: 'Escreva o que deve ser feito.' }
  if (pedido.length > PEDIDO_MAX) return { ok: false, erro: `O pedido ficou muito longo (máximo de ${PEDIDO_MAX} caracteres).` }

  const frequencia = texto(raw.frequencia) as Frequencia
  if (!(FREQUENCIAS as readonly string[]).includes(frequencia)) return { ok: false, erro: 'Escolha com que frequência isto se repete.' }

  const agenda: AgendaSpec = {
    frequencia,
    hora: texto(raw.hora),
    diaSemana: frequencia === 'semanal' ? inteiro(raw.diaSemana) : null,
    
    
    
    diasSemana: frequencia === 'semanal' ? listaDeDias(raw.diasSemana) : null,
    diaMes: frequencia === 'mensal' ? inteiro(raw.diaMes) : null,
    
    
    
    terminaEm: texto(raw.terminaEm) || null,
  }
  const v = validarAgenda(agenda)
  if (!v.ok) return { ok: false, erro: v.erro }

  const tituloBruto = texto(raw.titulo)
  const titulo = encurtarTitulo(tituloBruto || tituloDoPedido(pedido), TITULO_MAX)

  return {
    ok: true,
    valor: { agentId, titulo, pedido, agenda, ativa: raw.ativa === undefined ? true : raw.ativa === true },
  }
}
