






import { validarAgenda, type AgendaSpec, type Frequencia } from '@/lib/rotinas/agenda'
import { motivoDaRecusa } from './recusa'
import { normalizarCaminhoDaNota } from '@/lib/fontes/caminhoDaNota'
import { ERRO_CONEXAO_MALFORMADA } from '@/lib/fontes/mensagens'

export type Validacao<T> = { ok: true; valor: T } | { ok: false; erro: string }


export const ENTRADA_NOME_DA_FONTE = 'Dê um nome para esta fonte.'
export const ENTRADA_TIPO_NAO_SUPORTADO = 'Por enquanto eu conecto banco de dados.'
export const ENTRADA_CREDENCIAL_VAZIA = 'Cole a conexão de leitura do seu banco.'
export const ENTRADA_SEM_FREQUENCIA = 'Escolha com que frequência isto deve rodar.'
export const ENTRADA_FREQUENCIA_INVALIDA = 'Frequência inválida.'
export const ENTRADA_HORARIO_INVALIDO = 'Horário inválido, use HH:MM (ex.: 08:00).'
export const ENTRADA_FONTE_INVALIDA = 'Fonte inválida.'
export const ENTRADA_NOME_DA_PERGUNTA = 'Dê um nome para esta pergunta.'
export const ENTRADA_CONSULTA_VAZIA = 'A consulta está vazia.'
export const ENTRADA_SEM_DESTINO = 'Diga em que nota isto deve ser guardado.'


export const MENSAGENS_DE_ENTRADA: readonly string[] = [
  ENTRADA_NOME_DA_FONTE, ENTRADA_TIPO_NAO_SUPORTADO, ENTRADA_CREDENCIAL_VAZIA,
  ENTRADA_SEM_FREQUENCIA, ENTRADA_FREQUENCIA_INVALIDA, ENTRADA_HORARIO_INVALIDO,
  ENTRADA_FONTE_INVALIDA, ENTRADA_NOME_DA_PERGUNTA, ENTRADA_CONSULTA_VAZIA,
  ENTRADA_SEM_DESTINO,
]

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const FREQUENCIAS: readonly Frequencia[] = ['diaria', 'semanal', 'mensal']

function texto(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!t || t.length > max) return null
  return t
}

export function normalizarFonte(
  body: unknown,
): Validacao<{ nome: string; tipo: 'banco'; credencial: string }> {
  const b = (body ?? {}) as Record<string, unknown>
  const nome = texto(b.nome, 80)
  if (!nome) return { ok: false, erro: ENTRADA_NOME_DA_FONTE }
  if (b.tipo !== 'banco') return { ok: false, erro: ENTRADA_TIPO_NAO_SUPORTADO }
  const credencial = texto(b.credencial, 2000)
  if (!credencial) return { ok: false, erro: ENTRADA_CREDENCIAL_VAZIA }
  
  
  
  
  if (!/^postgres(ql)?:\/\//i.test(credencial)) return { ok: false, erro: ERRO_CONEXAO_MALFORMADA }
  return { ok: true, valor: { nome, tipo: 'banco', credencial } }
}


function lerAgenda(v: unknown): Validacao<AgendaSpec> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    return { ok: false, erro: ENTRADA_SEM_FREQUENCIA }
  }
  const a = v as Record<string, unknown>
  if (typeof a.frequencia !== 'string' || !FREQUENCIAS.includes(a.frequencia as Frequencia)) {
    return { ok: false, erro: ENTRADA_FREQUENCIA_INVALIDA }
  }
  if (typeof a.hora !== 'string') return { ok: false, erro: ENTRADA_HORARIO_INVALIDO }
  const spec: AgendaSpec = {
    frequencia: a.frequencia as Frequencia,
    hora: a.hora,
    diaSemana: typeof a.diaSemana === 'number' ? a.diaSemana : null,
    diaMes: typeof a.diaMes === 'number' ? a.diaMes : null,
  }
  
  
  const veredito = validarAgenda(spec)
  if (!veredito.ok) return { ok: false, erro: veredito.erro }
  return { ok: true, valor: spec }
}

export function normalizarConsulta(
  body: unknown,
): Validacao<{ fonteId: string; rotulo: string; corpo: string; notaPath: string; agenda: AgendaSpec }> {
  const b = (body ?? {}) as Record<string, unknown>
  const fonteId = texto(b.fonteId, 40)
  if (!fonteId || !RE_UUID.test(fonteId)) return { ok: false, erro: ENTRADA_FONTE_INVALIDA }
  const rotulo = texto(b.rotulo, 80)
  if (!rotulo) return { ok: false, erro: ENTRADA_NOME_DA_PERGUNTA }
  const corpo = texto(b.corpo, 4000)
  if (!corpo) return { ok: false, erro: ENTRADA_CONSULTA_VAZIA }
  const cru = texto(b.notaPath, 200)
  if (!cru) return { ok: false, erro: ENTRADA_SEM_DESTINO }
  
  
  
  
  const notaPath = normalizarCaminhoDaNota(cru)

  
  
  
  
  const recusa = motivoDaRecusa(corpo, notaPath)
  if (recusa) return { ok: false, erro: recusa }

  const agenda = lerAgenda(b.agenda)
  if (!agenda.ok) return agenda
  return { ok: true, valor: { fonteId, rotulo, corpo, notaPath, agenda: agenda.valor } }
}
