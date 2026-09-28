
import {
  correrContraORelogio,
  iterateChunks,
  orcamentoDeEspera,
  EXPIROU,
  type ControleDePrazo,
  type PrazoDoTurno,
} from '../relogioDoTurno'
import {
  renderBlocoDeFechamento,
  fechamentoFicouIncompleto,
  precisaFechamento,
  precisaFechamentoDaInvestigacao,
  type InterlocutorDoTurno,
  type MotivoDoFim,
  type ResultadoDeTool,
} from '../../../lib/conversa/fechamentoDoTurno'
import { getTurnContext } from '../turnContext'
import { blocoDaInvestigacaoParaFechamento } from '../../bancada/investigacaoDoTurno'


const INATIVIDADE_MS = 120_000

const INATIVIDADE_TOOL_MS = 240_000

const RODADA_MAX_MS = 420_000

const FECHAMENTO_MAX_MS = 60_000

const MAX_RESULTADOS_GUARDADOS = 12

export interface HeadlessAgentLike {
  
  
  stream(
    messages: unknown,
    options?: { maxSteps?: number; abortSignal?: AbortSignal; toolChoice?: 'none' },
  ): Promise<{ fullStream: unknown }>
}

export interface RoundResult {
  text: string
  pendingApprovalId: string | null
  finished: boolean
  inputTokens: number
  outputTokens: number
  
  cachedTokens?: number
  
  fimAnormal?: MotivoDoFim
  
  rodouFerramenta?: boolean
  
  erroDoModelo?: boolean
  
  fechamentoRodou?: boolean
  
  fechamentoEscreveu?: boolean
  
  fechamentoExpirou?: boolean
}

export interface RunRoundOptions {
  maxSteps: number
  onStep?: () => void | Promise<void>
  
  onToolCall?: (call: { toolName: string; args?: unknown }) => void
  
  inatividadeMs?: number
  
  inatividadeToolMs?: number
  
  rodadaMaxMs?: number
  
  onErroDoModelo?: (erro: unknown) => void
  
  fechamento?: boolean
  
  fechamentoMaxMs?: number
  
  interlocutor?: InterlocutorDoTurno
}


export function extractPendingApprovalId(result: unknown): string | undefined {
  const r = result as { data?: { status?: string; approvalId?: string }; status?: string; approvalId?: string } | null | undefined
  if (r?.data?.status === 'pending_approval') return r.data.approvalId
  if (r?.status === 'pending_approval') return r.approvalId
  return undefined
}

function chunkType(chunk: unknown): string | undefined {
  return (chunk as { type?: unknown })?.type as string | undefined
}

export async function runAgentRound(
  agent: HeadlessAgentLike,
  messages: unknown,
  opts: RunRoundOptions,
): Promise<RoundResult> {
  let text = ''
  let pendingApprovalId: string | null = null
  let finished = false
  let rodouFerramenta = false
  let erroDoModelo = false
  let fechamentoRodou = false
  let fechamentoEscreveu = false
  let fechamentoExpirou = false
  
  
  const resultados: ResultadoDeTool[] = []
  let inputTokens = 0
  let outputTokens = 0
  let cachedTokens = 0

  const controle: ControleDePrazo = { expirou: false, toolsEmVoo: 0 }
  const prazo: PrazoDoTurno = {
    inatividadeMs: opts.inatividadeMs ?? INATIVIDADE_MS,
    inatividadeToolMs: opts.inatividadeToolMs ?? INATIVIDADE_TOOL_MS,
    turnoMaxMs: opts.rodadaMaxMs ?? RODADA_MAX_MS,
    inicio: Date.now(),
  }
  
  const resultado = (): RoundResult => ({
    text, pendingApprovalId, finished, inputTokens, outputTokens, cachedTokens,
    rodouFerramenta, erroDoModelo, fechamentoRodou, fechamentoEscreveu, fechamentoExpirou,
    ...(controle.expirou ? { fimAnormal: 'prazo' as const } : {}),
  })

  
  
  if (orcamentoDeEspera(prazo, controle, Date.now()) <= 0) {
    controle.expirou = true
    return resultado()
  }
  
  
  const corte = new AbortController()
  const criacao = agent.stream(messages, { maxSteps: opts.maxSteps, abortSignal: corte.signal })
  const criado = await correrContraORelogio(criacao, orcamentoDeEspera(prazo, controle, Date.now()))
  if (criado === EXPIROU) {
    controle.expirou = true
    corte.abort()
    
    
    
    void criacao.then((r) => (r.fullStream as ReadableStream).cancel()).catch(() => {  })
    return resultado()
  }

  
  
  
  
  try {
    for await (const value of iterateChunks(criado.fullStream, prazo, controle, () => corte.abort())) {
      const type = chunkType(value)

      if (type === 'text-delta') {
        text += (value as { payload?: { text?: string } }).payload?.text ?? ''
      } else if (type === 'tool-call') {
        
        
        
        
        
        controle.toolsEmVoo++
        rodouFerramenta = true
        
        
        if (opts.onToolCall) {
          const p = (value as { payload?: { toolName?: string; args?: unknown } }).payload
          if (p?.toolName) opts.onToolCall({ toolName: p.toolName, args: p.args })
        }
      } else if (type === 'tool-result') {
        
        
        controle.toolsEmVoo = Math.max(0, controle.toolsEmVoo - 1)
        const p = (value as { payload?: { toolName?: string; result?: unknown } }).payload
        if (pendingApprovalId == null) {
          const id = extractPendingApprovalId(p?.result)
          if (id) pendingApprovalId = id 
        }
        
        if (opts.fechamento && resultados.length < MAX_RESULTADOS_GUARDADOS) {
          resultados.push({ toolName: p?.toolName ?? 'ferramenta', result: p?.result })
        }
      } else if (type === 'tool-error') {
        
        
        controle.toolsEmVoo = Math.max(0, controle.toolsEmVoo - 1)
      } else if (type === 'step-finish') {
        
        
        
        const usage = (value as { payload?: { output?: { usage?: { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number } } } })
          .payload?.output?.usage
        inputTokens += usage?.inputTokens ?? 0
        outputTokens += usage?.outputTokens ?? 0
        cachedTokens += usage?.cachedInputTokens ?? 0
        if (opts.onStep) await opts.onStep()
      } else if (type === 'finish') {
        finished = true
      } else if (type === 'error') {
        
        
        erroDoModelo = true
        if (opts.onErroDoModelo) opts.onErroDoModelo((value as { payload?: { error?: unknown } }).payload?.error)
      }
      
    }
  } catch (err) {
    erroDoModelo = true
    if (opts.onErroDoModelo) opts.onErroDoModelo(err)
    throw err
  }

  
  
  
  
  
  
  
  
  
  
  
  
  
  const ledgerDaInvestigacao = opts.fechamento ? getTurnContext().investigacao?.ledger : undefined
  const blocoDaInvestigacao = blocoDaInvestigacaoParaFechamento(ledgerDaInvestigacao)

  
  
  
  
  
  
  
  if (
    opts.fechamento && !erroDoModelo &&
    (finished
      ? !controle.expirou && precisaFechamento({ texto: text, pendingApprovalId, algoVisivel: false })
      : controle.expirou && precisaFechamentoDaInvestigacao({
          ledgerVazio: !blocoDaInvestigacao, pendingApprovalId, fechamentoJaRodou: fechamentoRodou,
        }))
  ) {
    fechamentoRodou = true
    
    
    
    
    
    if (opts.onStep) {
      try { await opts.onStep() } catch (e) { console.warn('[runAgentRound] onStep antes do fechamento falhou (não-fatal):', e) }
    }
    
    
    const blocoPronto = finished
      ? blocoDaInvestigacaoParaFechamento(ledgerDaInvestigacao, 'silencio')
      : blocoDaInvestigacao
    const f = await rodarFechamentoHeadless(
      agent, messages, resultados, rodouFerramenta, opts.interlocutor, blocoPronto,
      opts.fechamentoMaxMs ?? FECHAMENTO_MAX_MS,
    )
    fechamentoEscreveu = f.text.trim().length > 0
    fechamentoExpirou = f.expirou
    
    
    
    if (text.trim()) { if (f.text) text = `${text}\n\n${f.text}` }
    else text = f.text
    inputTokens += f.inputTokens
    outputTokens += f.outputTokens
    cachedTokens += f.cachedTokens
  }

  return resultado()
}


async function rodarFechamentoHeadless(
  agent: HeadlessAgentLike,
  messages: unknown,
  resultados: ResultadoDeTool[],
  rodouFerramenta: boolean,
  quem: InterlocutorDoTurno = 'operador',
  
  blocoPronto?: { header: string; bloco: string },
  orcamentoMs: number = FECHAMENTO_MAX_MS,
): Promise<{ text: string; inputTokens: number; outputTokens: number; cachedTokens: number; expirou: boolean }> {
  const saida = { text: '', inputTokens: 0, outputTokens: 0, cachedTokens: 0, expirou: false }
  const controle: ControleDePrazo = { expirou: false, toolsEmVoo: 0 }
  const prazo: PrazoDoTurno = {
    inatividadeMs: orcamentoMs,
    inatividadeToolMs: orcamentoMs,
    turnoMaxMs: orcamentoMs,
    inicio: Date.now(),
  }
  try {
    const bloco = renderBlocoDeFechamento(resultados, rodouFerramenta, quem, blocoPronto)
    
    
    
    
    const msgs = Array.isArray(messages) ? [...messages, { role: 'user', content: bloco }] : messages
    const corte = new AbortController()
    const criacao = agent.stream(msgs, { maxSteps: 1, toolChoice: 'none', abortSignal: corte.signal })
    const criado = await correrContraORelogio(criacao, orcamentoMs)
    if (criado === EXPIROU) {
      saida.expirou = true
      corte.abort()
      void criacao.then((r) => (r.fullStream as ReadableStream).cancel()).catch(() => {  })
      return saida
    }
    
    
    
    let terminou = false
    for await (const chunk of iterateChunks(criado.fullStream, prazo, controle, () => corte.abort())) {
      const tipo = chunkType(chunk)
      if (tipo === 'finish') terminou = true
      if (tipo === 'text-delta') {
        saida.text += (chunk as { payload?: { text?: string } }).payload?.text ?? ''
      } else if (tipo === 'step-finish') {
        const usage = (chunk as { payload?: { output?: { usage?: { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number } } } })
          .payload?.output?.usage
        saida.inputTokens += usage?.inputTokens ?? 0
        saida.outputTokens += usage?.outputTokens ?? 0
        saida.cachedTokens += usage?.cachedInputTokens ?? 0
      }
      
    }
    saida.expirou = fechamentoFicouIncompleto(controle.expirou, terminou)
  } catch (err) {
    console.warn('[runAgentRound] rodada de fechamento falhou (fail-open):', err)
    
    
    return { text: '', inputTokens: saida.inputTokens, outputTokens: saida.outputTokens, cachedTokens: saida.cachedTokens, expirou: controle.expirou }
  }
  return saida
}
