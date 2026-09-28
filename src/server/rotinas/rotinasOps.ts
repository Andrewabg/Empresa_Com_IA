






import {
  criarRotina, listarRotinas, atualizarRotina, removerRotina, agendaDaRotina, type RotinaRow,
} from '@/data/rotinas'
import { listAgentsSummary } from '@/data/agents'
import { getSetting } from '@/data/settings'
import { validarTz, TZ_DEFAULT } from '@/server/proativo/dispatcher'
import {
  descreverAgenda, descreverProxima, proximaExecucaoAte, validarAgenda, estadoDaAgenda,
  SEM_EXECUCAO_ATE_O_TERMINO, type AgendaSpec, type Frequencia,
} from '@/lib/rotinas/agenda'
import { tituloDoPedido } from '@/lib/rotinas/entrada'
import { encurtarTitulo } from '@/lib/encurtarTitulo'
import { AVISO_ROTINA_SEM_CANAL, temDestino } from '@/lib/proativo/destinoDoAviso'
import { avaliarJustificativaDeRepeticao } from '@/lib/proativo/justificativaDeRepeticao'
import { falasDoDonoDoTurno } from '@/server/agent/turnContext'

export interface RotinasOpsDeps {
  criar: typeof criarRotina
  listar: typeof listarRotinas
  atualizar: typeof atualizarRotina
  remover: typeof removerRotina
  
  elenco: () => Promise<{ id: string; nome: string }[]>
  getTz: () => Promise<string>
  now: () => string
  
  getOwnerRaw: () => Promise<string | null>
}

export interface RotinasInput {
  acao: 'criar' | 'listar' | 'pausar' | 'retomar' | 'remover'
  
  agente?: string
  titulo?: string
  pedido?: string
  frequencia?: Frequencia
  hora?: string
  diaSemana?: number
  diasSemana?: number[]
  diaMes?: number
  
  terminaEm?: string
  
  porqueRepete?: string
  
  rotina?: string
}

const RE_INDICE = /^\d{1,4}$/


export const ROTINA_SEM_RITMO_PEDIDO =
  'Não achei nas suas palavras com que frequência isso se repete, e rotina é trabalho que volta sozinho. Me diga o ritmo (por exemplo "toda segunda" ou "todo dia útil") que eu combino. Se era para acontecer uma vez só, me peça um lembrete.'


export const ROTINA_JA_ENCERRADA =
  'Essa rotina já chegou ao fim na data que você combinou. Para ela voltar a rodar, mude a data de término em Rotinas.'

async function defaultDeps(): Promise<RotinasOpsDeps> {
  return {
    criar: criarRotina, listar: listarRotinas, atualizar: atualizarRotina, remover: removerRotina,
    elenco: async () => (await listAgentsSummary()).filter((a) => a.enabled).map((a) => ({ id: a.id, nome: a.name })),
    getTz: async () => validarTz((await getSetting('operator_timezone')) ?? TZ_DEFAULT),
    now: () => new Date().toISOString(),
    getOwnerRaw: () => getSetting('telegram_owner_chat'),
  }
}


function formatarLista(rotinas: RotinaRow[], nomePorId: Map<string, string>, agora: string, tz: string): string {
  if (!rotinas.length) return 'Nenhuma rotina configurada ainda.'
  const linhas = rotinas.map((r, i) => {
    const quem = nomePorId.get(r.agent_id) ?? r.agent_id
    
    
    const estado = estadoDaAgenda(agendaDaRotina(r), r.ativa, agora, tz)
    const quando = estado === 'ativa'
      ? `próxima ${descreverProxima(r.proxima_execucao, agora, tz)}`
      : estado === 'encerrada' ? 'encerrada, como combinado' : 'pausada'
    return `${i + 1}. ${r.titulo} — ${quem}, ${descreverAgenda(agendaDaRotina(r))} (${quando})`
  })
  return linhas.join('\n')
}


function acharAgente(elenco: { id: string; nome: string }[], ref: string): { id: string; nome: string } | null {
  const alvo = ref.trim().toLowerCase()
  if (!alvo) return null
  return elenco.find((a) => a.id.toLowerCase() === alvo)
    ?? elenco.find((a) => a.nome.toLowerCase() === alvo)
    ?? elenco.find((a) => a.nome.toLowerCase().startsWith(alvo))
    ?? null
}

export async function executarRotinas(
  input: RotinasInput,
  ctx?: { actingAgentId?: string | null },
  deps?: RotinasOpsDeps,
): Promise<{ ok: boolean; message: string }> {
  const d = deps ?? (await defaultDeps())
  try {
    const agora = d.now()

    if (input.acao === 'listar') {
      const [rotinas, elenco, tz] = await Promise.all([d.listar(), d.elenco(), d.getTz()])
      return { ok: true, message: formatarLista(rotinas, new Map(elenco.map((a) => [a.id, a.nome])), agora, tz) }
    }

    if (input.acao === 'criar') {
      const pedido = input.pedido?.trim()
      if (!pedido) return { ok: false, message: 'Me diga O QUE deve ser feito na rotina.' }
      if (!input.frequencia) return { ok: false, message: 'Com que frequência isso se repete — todo dia, toda semana ou todo mês?' }

      const agenda: AgendaSpec = {
        frequencia: input.frequencia,
        hora: input.hora ?? '',
        diaSemana: input.frequencia === 'semanal' ? (input.diaSemana ?? null) : null,
        diasSemana: input.frequencia === 'semanal' ? (input.diasSemana ?? null) : null,
        diaMes: input.frequencia === 'mensal' ? (input.diaMes ?? null) : null,
        terminaEm: input.terminaEm?.trim() || null,
      }
      const v = validarAgenda(agenda)
      if (!v.ok) return { ok: false, message: v.erro }

      
      
      
      if (!avaliarJustificativaDeRepeticao(input.porqueRepete, falasDoDonoDoTurno()).justificada) {
        return { ok: false, message: ROTINA_SEM_RITMO_PEDIDO }
      }

      
      
      
      const temCanal = temDestino(await d.getOwnerRaw())

      const elenco = await d.elenco()
      
      const ref = input.agente?.trim() || ctx?.actingAgentId || ''
      const agente = acharAgente(elenco, ref)
      if (!agente) {
        const nomes = elenco.map((a) => a.nome).join(', ')
        return { ok: false, message: `Não achei esse funcionário. Quem trabalha aqui: ${nomes || 'ninguém ligado no momento'}.` }
      }

      const tz = await d.getTz()
      
      
      const primeira = proximaExecucaoAte(agenda, agora, tz)
      if (primeira === null) return { ok: false, message: SEM_EXECUCAO_ATE_O_TERMINO }
      const rotina = await d.criar({
        agentId: agente.id,
        titulo: encurtarTitulo(input.titulo?.trim() || tituloDoPedido(pedido), 80),
        pedido,
        agenda,
        proximaExecucao: primeira,
      })
      const aviso = temCanal ? '' : ` ${AVISO_ROTINA_SEM_CANAL}`
      
      
      
      const semFim = agenda.terminaEm ? '' : ', sem data para parar'
      return {
        ok: true,
        message: `Combinado. ${agente.nome}: ${descreverAgenda(agenda)}${semFim}. Primeira vez ${descreverProxima(rotina.proxima_execucao, agora, tz)}.${aviso}`,
      }
    }

    
    const ref = input.rotina?.trim()
    if (!ref) return { ok: false, message: 'Qual rotina? Me diga o número dela na lista (peça a lista antes, se precisar).' }
    const rotinas = await d.listar()
    if (!RE_INDICE.test(ref)) return { ok: false, message: 'Me diga o NÚMERO da rotina na lista.' }
    const idx = Number(ref)
    if (idx < 1 || idx > rotinas.length) return { ok: false, message: `Não achei a rotina ${idx} — me pede a lista de novo?` }
    const alvo = rotinas[idx - 1]

    if (input.acao === 'remover') {
      const ok = await d.remover(alvo.id)
      return ok ? { ok: true, message: `Removida: ${alvo.titulo}.` } : { ok: false, message: 'Não achei essa rotina — lista pra mim?' }
    }

    const ativa = input.acao === 'retomar'
    const tz = await d.getTz()
    
    
    const retomada = ativa ? proximaExecucaoAte(agendaDaRotina(alvo), agora, tz) : null
    if (ativa && retomada === null) {
      return { ok: false, message: ROTINA_JA_ENCERRADA }
    }
    const nova = await d.atualizar(alvo.id, {
      ativa,
      ...(retomada ? { proximaExecucao: retomada } : {}),
    })
    return ativa
      ? { ok: true, message: `Religada: ${alvo.titulo}. Próxima ${descreverProxima(nova.proxima_execucao, agora, tz)}.` }
      : { ok: true, message: `Pausada: ${alvo.titulo}. Ela fica guardada até você religar.` }
  } catch (err) {
    console.warn('[rotinas/rotinasOps]', err)
    return { ok: false, message: 'Não consegui mexer nas rotinas agora — tenta de novo.' }
  }
}
