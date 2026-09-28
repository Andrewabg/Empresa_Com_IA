
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'

import { appendTranscript, getSession, patchBrief, type HiringSessionRow, type TranscriptMsg } from '@/data/hiringSessions'
import { mergeRefreshPromocoes } from '@/lib/hiring/refresh-merge'
import { hiringCoverage } from '@/lib/hiring/coverage'
import { hiringDirective } from '@/lib/hiring/directive'
import { listConnectedToolkitSlugs } from '../config/connections'
import { recordCost } from '@/data/cost'
import { avisoDeDemora, LINHA_DEMORA } from '@/lib/conversa/fechamentoDoTurno'
import {
  correrContraORelogio,
  iterateChunks,
  orcamentoDeEspera,
  EXPIROU,
  type ControleDePrazo,
  type PrazoDoTurno,
} from '../agent/relogioDoTurno'
import { runWithTurnContext } from '../agent/turnContext'
import { HIRING_SESSION_DATA_TYPE, HIRING_TOOLKIT_DATA_TYPE } from '../agent/wireTypes'
import { getRhAgent, refreshBriefConexoes, RH_MODEL, type HiringEmitPart, type RhBuildDeps } from './rh'
import { somarUsage } from '@/lib/hiring/usage'


const TRANSCRIPT_CAP = 30


const KICKOFF_PROMPT = 'Abra a entrevista: cumprimente e pergunte o que o aluno quer que o novo agente faça.'


const KICKOFF_PROMPT_REVISAO = 'Cumprimente o dono, diga que vai ajudar a AJUSTAR este agente que ele já tem, e pergunte o que ele quer mudar (missão, ferramentas ou fronteiras).'


interface RhAgentLike {
  stream(messages: unknown, options?: unknown): Promise<{ fullStream: unknown }>
}


function chunkType(chunk: unknown): string | undefined {
  return (chunk as { type?: unknown })?.type as string | undefined
}




const INATIVIDADE_MS = 60_000
const INATIVIDADE_TOOL_MS = 120_000
const TURNO_MAX_MS = 180_000

export interface RunHiringTurnArgs {
  session: HiringSessionRow
  
  userText?: string
  
  kickoff?: boolean
  
  operatorId?: string
  
  emitSessionId?: boolean
  
  inatividadeMs?: number
  inatividadeToolMs?: number
  turnoMaxMs?: number
  deps?: {
    rh?: RhBuildDeps
    
    listConnected?: () => Promise<string[]>
    
    agent?: RhAgentLike
  }
}


export async function runHiringTurn(args: RunHiringTurnArgs): Promise<Response> {
  const { session, kickoff, operatorId } = args
  const userText = args.userText ?? ''
  const emitSessao = args.emitSessionId ?? session.transcript.length === 0

  
  
  const emitFila: HiringEmitPart[] = []

  
  
  
  const listConnected = args.deps?.listConnected ?? (() => listConnectedToolkitSlugs())
  const conectados = await listConnected().catch(() => [] as string[])
  const refreshed = refreshBriefConexoes(session.brief, conectados)
  let brief = session.brief
  if (refreshed !== session.brief) {
    
    
    
    
    
    const fresh = await getSession(session.id).catch(() => null)
    const { brief: merged, slugsAEmitir } = mergeRefreshPromocoes(refreshed, session.brief, fresh?.brief ?? null)
    brief = merged
    await patchBrief(session.id, brief)
    for (const slug of slugsAEmitir) {
      const efetivo = brief.ferramentas.find((x) => x.slug === slug)
      if (efetivo) {
        emitFila.push({
          type: HIRING_TOOLKIT_DATA_TYPE,
          data: { toolkit: { slug: efetivo.slug, name: efetivo.name, status: efetivo.status, validado: true } },
          transient: true,
        })
      }
    }
  }

  
  const agent: RhAgentLike = args.deps?.agent ?? await getRhAgent(session.id, session.mode, emitFila, args.deps?.rh)

  
  
  
  
  const turnos = session.transcript.filter((m) => m.role === 'user').length
  const directive = hiringDirective(hiringCoverage(brief, session.mode), session.mode, turnos)
  const history = session.transcript
    .slice(-TRANSCRIPT_CAP)
    .map((m) => ({ role: m.role, content: m.content }))
  const mensagens: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: directive },
    ...history,
    { role: 'user', content: kickoff ? (session.mode === 'revisao' ? KICKOFF_PROMPT_REVISAO : KICKOFF_PROMPT) : userText },
  ]

  const uiStream = createUIMessageStream({
    execute: async ({ writer }) => {
      let assistantText = ''
      const textId = 'rh-text'
      let persisted = false
      
      
      const controle: ControleDePrazo = { expirou: false, toolsEmVoo: 0 }
      const prazo: PrazoDoTurno = {
        inatividadeMs: args.inatividadeMs ?? INATIVIDADE_MS,
        inatividadeToolMs: args.inatividadeToolMs ?? INATIVIDADE_TOOL_MS,
        turnoMaxMs: args.turnoMaxMs ?? TURNO_MAX_MS,
        inicio: Date.now(),
      }
      
      
      let rodouFerramenta = false
      
      
      
      const stepFinishChunks: unknown[] = []

      const persistir = async () => {
        const msgs: TranscriptMsg[] = []
        const at = new Date().toISOString()
        if (!kickoff && userText) msgs.push({ role: 'user', content: userText, at })
        if (assistantText) msgs.push({ role: 'assistant', content: assistantText, at })
        if (msgs.length) await appendTranscript(session.id, msgs)
      }

      
      
      if (emitSessao) {
        writer.write({ type: HIRING_SESSION_DATA_TYPE, data: { id: session.id }, transient: true })
      }
      
      for (const part of emitFila.splice(0)) writer.write(part)

      writer.write({ type: 'text-start', id: textId })

      try {
        
        
        
        
        await runWithTurnContext({ actingAgentId: 'rh', operatorId }, async () => {
          
          
          
          
          const orcamentoDeCriacao = orcamentoDeEspera(prazo, controle, Date.now())
          if (orcamentoDeCriacao <= 0) { controle.expirou = true; return }
          
          const corte = new AbortController()
          const criacao = agent.stream(mensagens, { abortSignal: corte.signal })
          const criado = await correrContraORelogio(criacao, orcamentoDeCriacao)
          if (criado === EXPIROU) {
            controle.expirou = true
            corte.abort()
            
            
            void criacao.then((r) => (r.fullStream as ReadableStream).cancel()).catch(() => {  })
            return
          }
          const { fullStream } = criado
          for await (const chunk of iterateChunks(fullStream, prazo, controle, () => corte.abort())) {
            const type = chunkType(chunk)
            if (type === 'text-delta') {
              const text = (chunk as { payload?: { text?: string } }).payload?.text ?? ''
              if (text) {
                assistantText += text
                writer.write({ type: 'text-delta', id: textId, delta: text })
              }
            } else if (type === 'tool-call') {
              
              
              
              
              
              controle.toolsEmVoo++
              rodouFerramenta = true
            } else if (type === 'tool-result') {
              
              
              controle.toolsEmVoo = Math.max(0, controle.toolsEmVoo - 1)
              rodouFerramenta = true
              
              for (const part of emitFila.splice(0)) writer.write(part)
            } else if (type === 'tool-error') {
              
              
              controle.toolsEmVoo = Math.max(0, controle.toolsEmVoo - 1)
              rodouFerramenta = true
            } else if (type === 'step-finish') {
              
              stepFinishChunks.push(chunk)
            }
            
          }
        })

        
        
        
        
        if (controle.expirou) {
          const remate = assistantText.trim() ? LINHA_DEMORA : avisoDeDemora(rodouFerramenta)
          assistantText += remate
          writer.write({ type: 'text-delta', id: textId, delta: remate })
        }

        writer.write({ type: 'text-end', id: textId })
        
        for (const part of emitFila.splice(0)) writer.write(part)

        
        const { in: inUsed, out: outUsed, cached: cachedUsed } = somarUsage(stepFinishChunks)
        if (inUsed > 0 || outUsed > 0) {
          try {
            await recordCost({
              kind: 'chat',
              model: args.deps?.rh?.model ?? RH_MODEL,
              promptTokens: inUsed,
              completionTokens: outUsed,
              cachedTokens: cachedUsed,
              agent: 'rh',
            })
          } catch {
            
          }
        } else {
          console.warn('[hiring cost] usage zerado após o stream — step-finish pode não estar trazendo usage')
        }

        
        persisted = true
        await persistir()
      } finally {
        
        
        
        
        if (!persisted) {
          try {
            await persistir()
          } catch (err) {
            console.warn('[runHiringTurn] persistência parcial falhou:', err instanceof Error ? err.message : err)
          }
        }
      }
    },
    onError: (error) => {
      console.error('[runHiringTurn] stream error:', error)
      return 'Erro ao gerar a resposta.'
    },
  })

  return createUIMessageStreamResponse({ stream: uiStream })
}
