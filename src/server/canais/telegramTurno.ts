






import { getPrimaryAgentComLinha } from '@/server/agent/jarvis'
import { roomConversation, appendMessage } from '@/data/messages'
import { recordCost as recordCostDefault, type RecordCostInput } from '@/data/cost'
import { transcribeBytes, estimarTokensAudio, estimarTokensTexto, sintetizarVoz as mediaSintetizarVoz } from './media'
import {
  sendText as tgSendText, sendChatAction as tgSendChatAction, sendPhoto as tgSendPhoto,
  sendVoice as tgSendVoice, sendDocument as tgSendDocument, editMessageText as tgEditMessageText,
  getFileBytes as tgGetFileBytes, type TgEvento, type SendResultado,
} from './telegram'
import { mdParaTextoPuro } from '@/lib/telegram/mdParaHtml'
import { comContextoNaUltimaMsg } from '@/lib/relogio'
import { falasDoDonoDasMensagens } from '@/lib/conversa/falasDoDono'
import {
  montarContextoConselheiro, type ContextoConselheiro,
} from '@/server/agent/montarContextoConselheiro'
import { runConversationTurn, type ChatAgentLike } from '@/server/agent/runConversationTurn'
import { conduzirTurno, capturarSemTool, type ResultadoTurno } from '@/server/onboarding/conduzirTurno'
import type { RunConversationTurnOpts } from '@/server/agent/runConversationTurn'
import type { ResumoTurno, TurnSink } from '@/server/agent/conselheiroEvents'
import { criarTelegramSink, type TelegramSink, type TelegramSinkDeps } from './telegramSink'
import { listArtifactIdsByConversation } from '@/data/artifacts'
import { serverDb } from '@/server/supabase'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { getSetting } from '@/data/settings'

const KEEPALIVE_MS = 4_000 





const MAX_PINGS = 84






















const TELEGRAM_TURNO_MAX_MS = 240_000
const TELEGRAM_FECHAMENTO_MAX_MS = 30_000



const MAX_STEPS = 8
const MODEL_FALLBACK = process.env.OPENAI_MODEL ?? 'gpt-5.1'
const PRIMARY_ID = 'jarvis'




export const MSG_FALHA =
  'Não consegui te responder agora. Parte do que eu comecei pode já ter sido feita, então me pergunte o que ficou pronto antes de pedir de novo.'


export const MSG_NAO_OUVI = 'Não consegui ouvir esse áudio. Pode digitar?'
export const MSG_FOTO_FALHOU = 'Não consegui baixar essa foto. Pode mandar de novo?'
export const MSG_AUDIO_FALHOU = 'Não consegui baixar esse áudio. Pode mandar de novo (ou digitar)?'



const MARCADOR_FOTO = '[foto enviada no Telegram]'

export interface OwnerChat { chatId: string; operatorId: string }

export interface TurnoDeps {
  room: (operatorId: string, agentId: string) => Promise<{ id: string }>
  appendMessage: typeof appendMessage
  
  montarContexto: (args: {
    operatorId: string
    conversationId: string
    userText: string
    incluirRoster?: boolean
    now?: string
  }) => Promise<ContextoConselheiro>
  getAgent: () => Promise<ChatAgentLike>
  
  runTurno: (
    agent: ChatAgentLike,
    messages: unknown,
    sink: TurnSink,
    opts: RunConversationTurnOpts,
  ) => Promise<ResumoTurno>
  
  criarSink: (chatId: string) => TelegramSink
  
  listArtifactIds: (conversationId: string) => Promise<string[]>
  
  conduzirEntrevista: typeof conduzirTurno
  
  capturarEntrevista: typeof capturarSemTool
  recordCost: (input: RecordCostInput) => Promise<void>
  
  getModel: () => Promise<string>
  
  sendText: (chatId: string, texto: string, opts?: { parseMode?: 'HTML' }) => Promise<SendResultado>
  sendChatAction: (chatId: string) => Promise<void>
  
  getFileBytes: (fileId: string, mimeHint?: string) => Promise<{ bytes: Uint8Array; mime: string } | null>
  transcrever: (bytes: Uint8Array, mime: string) => Promise<{ text: string; usage?: Record<string, number> | null }>
  now: () => string
  
  getRespostaVozPref: () => Promise<boolean>
  
  sintetizarVoz: (texto: string) => Promise<{ bytes: Uint8Array; mime: string }>
  sendVoice: (chatId: string, bytes: Uint8Array) => Promise<SendResultado>
}

export async function defaultTurnoDeps(): Promise<TurnoDeps> {
  const token = (await getSecret(SECRET_KEYS.telegram_bot_token)) ?? ''
  
  
  
  let primarioP: ReturnType<typeof getPrimaryAgentComLinha> | null = null
  const primario = () => (primarioP ??= getPrimaryAgentComLinha())
  
  
  const sinkDeps: TelegramSinkDeps = {
    sendText: (c, t, o) => tgSendText(token, c, t, o),
    sendPhoto: (c, url, cap) => tgSendPhoto(token, c, url, cap),
    sendDocument: (c, bytes, filename, cap) => tgSendDocument(token, c, bytes, filename, cap),
    editMessageText: (c, id, t, o) => tgEditMessageText(token, c, id, t, o),
    signArtifactUrl: async (storageRef) => {
      const { data, error } = await serverDb().storage.from('artifacts').createSignedUrl(storageRef, 3600)
      if (error || !data?.signedUrl) { console.warn('[telegramTurno] createSignedUrl falhou (pulo a foto):', error?.message); return null }
      return data.signedUrl
    },
  }
  return {
    room: roomConversation, appendMessage,
    montarContexto: (args) => montarContextoConselheiro(args),
    getAgent: async () => (await primario()).agent as unknown as ChatAgentLike,
    runTurno: (agent, messages, sink, opts) => runConversationTurn(agent, messages, sink, opts),
    criarSink: (chatId) => criarTelegramSink(chatId, sinkDeps),
    listArtifactIds: (conversationId) => listArtifactIdsByConversation(conversationId).catch(() => [] as string[]),
    conduzirEntrevista: conduzirTurno,
    capturarEntrevista: capturarSemTool,
    recordCost: recordCostDefault,
    getModel: async () => {
      try { return (await primario()).row.model ?? MODEL_FALLBACK } catch { return MODEL_FALLBACK }
    },
    sendText: (c, t, o) => tgSendText(token, c, t, o),
    sendChatAction: (c) => tgSendChatAction(token, c),
    getFileBytes: (f, hint) => tgGetFileBytes(token, f, undefined, hint),
    transcrever: (bytes, mime) => transcribeBytes({ bytes, mime }),
    now: () => new Date().toISOString(),
    getRespostaVozPref: async () => {
      try { return lerRespostaVozPref(await getSetting('notificacao_prefs')) } catch { return false }
    },
    sintetizarVoz: (t) => mediaSintetizarVoz(t),
    sendVoice: (c, b) => tgSendVoice(token, c, b),
  }
}


export function lerRespostaVozPref(raw: string | null): boolean {
  if (!raw) return false
  try { return (JSON.parse(raw) as { respostaVoz?: boolean }).respostaVoz === true } catch { return false }
}


type ParteRound = { type: 'text'; text: string } | { type: 'image'; image: Uint8Array; mediaType: string }
type MsgRound = { role: 'user' | 'assistant' | 'system'; content: string | ParteRound[] }


const NOTA_CANAL_TELEGRAM =
  'Canal desta mensagem: Telegram — quem fala é o DONO da empresa, NUNCA um funcionário: ' +
  'ao se dirigir a ele, jamais use um nome do organograma (nada de "Anotado, Rui" — Rui, Lia, ' +
  'Téo e João são seus FUNCIONÁRIOS, não quem está falando; trate o dono por você ou "chefe"). ' +
  'Markdown simples é bem-vindo (negrito, itálico, `código`, ' +
  'listas), mas NADA de tabelas nem títulos grandes (#) — mensagem curta de celular. ' +
  
  
  'Neste canal NÃO use a tool transferir (ela não funciona aqui — a sala continua sendo a sua); ' +
  'para falar de outro funcionário use consultarFuncionario. ' +
  
  
  
  'Para guardar algo durável na memória use a tool proporMemoria (o Curador decide o que ' +
  'entra sozinho e o que vira aprovação); NÃO use rascunharMemoria neste canal.'



const RESUMO_FALAVEL_MAX = 600


export function resumoFalavel(texto: string, max = RESUMO_FALAVEL_MAX): string {
  const t = texto.trim()
  if (t.length <= max) return t
  const janela = t.slice(0, max)
  let fim = -1
  for (const m of janela.matchAll(/[.!?…](?=\s)/g)) fim = m.index ?? fim
  if (fim >= max * 0.4) return janela.slice(0, fim + 1).trimEnd()
  const espaco = janela.lastIndexOf(' ')
  return (espaco > 0 ? janela.slice(0, espaco) : janela).trimEnd() + '…'
}


export async function processarTurnoDono(ev: TgEvento, owner: OwnerChat, deps?: TurnoDeps): Promise<void> {
  const d = deps ?? (await defaultTurnoDeps())
  
  
  
  
  let custoTranscricao: RecordCostInput | null = null
  let custoTts: RecordCostInput | null = null
  
  
  
  
  
  let pings = 0
  const ping = () => {
    if (++pings > MAX_PINGS) { clearInterval(keepAlive); return }
    try { void d.sendChatAction(owner.chatId).catch(() => {}) } catch {  }
  }
  const keepAlive = setInterval(ping, KEEPALIVE_MS)
  try {
    ping()

    let textoDoDono: string
    
    
    let imagemDoDono: { bytes: Uint8Array; mime: string } | null = null
    if (ev.kind === 'voz') {
      const bin = await d.getFileBytes(ev.fileId)
      if (!bin) { await d.sendText(owner.chatId, MSG_AUDIO_FALHOU); return }
      try {
        const t = await d.transcrever(bin.bytes, bin.mime)
        textoDoDono = t.text
        const u = t.usage ?? {}
        custoTranscricao = {
          kind: 'chat', model: 'gpt-4o-transcribe',
          
          
          promptTokens: u['input_tokens'] ?? u['prompt_tokens'] ?? estimarTokensAudio(bin.bytes.length),
          completionTokens: u['output_tokens'] ?? 0,
          tool: 'telegramVoz', agent: PRIMARY_ID,
        }
      } catch { await d.sendText(owner.chatId, MSG_NAO_OUVI); return }
      
      
      
      
      
      
      if (!textoDoDono.trim()) {
        await d.sendText(owner.chatId, MSG_NAO_OUVI)
        if (custoTranscricao) await d.recordCost(custoTranscricao).catch(() => {})
        return
      }
    } else if (ev.kind === 'foto') {
      
      
      const bin = await d.getFileBytes(ev.fileId, ev.mime)
      if (!bin) { await d.sendText(owner.chatId, MSG_FOTO_FALHOU); return }
      imagemDoDono = bin
      textoDoDono = ev.caption?.trim() ? `${ev.caption}\n${MARCADOR_FOTO}` : MARCADOR_FOTO
    } else if (ev.kind === 'texto') {
      textoDoDono = ev.texto
    } else return

    const conversa = await d.room(owner.operatorId, PRIMARY_ID)
    
    await d.appendMessage(conversa.id, 'user', textoDoDono)

    
    
    const now = d.now()
    const [contexto, seenIds, agent, model, entrevista] = await Promise.all([
      d.montarContexto({ operatorId: owner.operatorId, conversationId: conversa.id, userText: textoDoDono, incluirRoster: true, now }),
      d.listArtifactIds(conversa.id),
      d.getAgent(),
      d.getModel().catch(() => MODEL_FALLBACK),
      
      
      
      
      d.conduzirEntrevista({
        operatorId: owner.operatorId,
        conversationId: conversa.id,
        userText: textoDoDono,
        kickoff: false,
      }).catch((e): ResultadoTurno => {
        console.warn('[telegramTurno] entrevista falhou (o turno segue):', e)
        return { needed: false, fase: 'concluida', cobertos: 0, total: 0 }
      }),
    ])

    
    
    
    
    
    
    
    
    const base: MsgRound[] = [
      ...(contexto.rosterBlock ? [{ role: 'system' as const, content: contexto.rosterBlock }] : []),
      ...(contexto.memoryBlock ? [{ role: 'system' as const, content: contexto.memoryBlock }] : []),
      
      ...(contexto.resumoRetomada ? [{ role: 'system' as const, content: contexto.resumoRetomada }] : []),
      ...contexto.history,
    ]
    
    
    if (imagemDoDono) {
      const partes: ParteRound[] = [
        { type: 'text', text: ev.kind === 'foto' && ev.caption?.trim() ? ev.caption : 'O dono enviou esta imagem.' },
        { type: 'image', image: imagemDoDono.bytes, mediaType: imagemDoDono.mime },
      ]
      
      
      
      
      
      
      let trocada = false
      for (let i = base.length - 1; i >= 0; i--) {
        const b = base[i]
        if (b.role !== 'user') continue
        if (b.content === textoDoDono) { base[i] = { role: 'user', content: partes }; trocada = true }
        break 
      }
      if (!trocada) base.push({ role: 'user', content: partes })
    }
    
    
    
    
    
    
    const sufixo = [
      contexto.suffixContext,
      NOTA_CANAL_TELEGRAM,
      entrevista.needed ? entrevista.directive : undefined,
    ].filter(Boolean).join('\n\n')
    const msgs = comContextoNaUltimaMsg(base, sufixo)

    
    
    
    const sink = d.criarSink(owner.chatId)
    const resumo = await d.runTurno(agent, msgs, sink, {
      conversationId: conversa.id,
      operatorId: owner.operatorId,
      
      
      
      tz: contexto.tz,
      
      
      
      
      
      
      
      
      
      papel: 'dono',
      
      
      
      falasDoDono: falasDoDonoDasMensagens(base),
      costAgentId: PRIMARY_ID,
      costModel: model,
      maxSteps: MAX_STEPS,
      seenArtifactIds: new Set<string>(seenIds),
      emitConversationId: false,
      
      
      
      turnoMaxMs: TELEGRAM_TURNO_MAX_MS,
      fechamentoMaxMs: TELEGRAM_FECHAMENTO_MAX_MS,
    })

    
    
    
    
    if (entrevista.slotAtivo && textoDoDono.trim()) {
      await d.capturarEntrevista({
        operatorId: owner.operatorId,
        conversationId: conversa.id,
        slotId: entrevista.slotAtivo,
        userText: textoDoDono,
        toolNames: resumo.toolNames,
      }).catch(() => 'ignorado' as const)
    }

    
    
    
    const registrarCustosMidia = async () => {
      if (custoTranscricao) { await d.recordCost(custoTranscricao).catch(() => {}); custoTranscricao = null }
      if (custoTts) { await d.recordCost(custoTts).catch(() => {}); custoTts = null }
    }

    
    
    
    
    
    
    
    if (!resumo.text.trim()) {
      
      await d.sendText(owner.chatId, MSG_FALHA)
      await registrarCustosMidia()
      return
    }
    
    
    
    
    await sink.finalizar(resumo.text)
    
    
    
    if (ev.kind === 'voz') {
      try {
        if (await d.getRespostaVozPref()) {
          
          const fala = resumoFalavel(mdParaTextoPuro(resumo.text))
          const voz = await d.sintetizarVoz(fala)
          const rVoz = await d.sendVoice(owner.chatId, voz.bytes)
          if (!rVoz.ok) console.warn('[telegramTurno] sendVoice falhou:', rVoz.erro)
          
          
          
          custoTts = {
            kind: 'chat', model: 'gpt-4o-mini-tts',
            promptTokens: estimarTokensTexto(fala), completionTokens: estimarTokensAudio(voz.bytes.length),
            tool: 'telegramVozResposta', agent: PRIMARY_ID,
          }
        }
      } catch (e) { console.warn('[telegramTurno] TTS falhou (segue só o texto):', e) }
    }
    await registrarCustosMidia()
  } catch (err) {
    console.warn('[telegramTurno] turno falhou:', err)
    try { await d.sendText(owner.chatId, MSG_FALHA) } catch {  }
    
    
    if (custoTranscricao) await d.recordCost(custoTranscricao).catch(() => {})
    if (custoTts) await d.recordCost(custoTts).catch(() => {})
  } finally {
    clearInterval(keepAlive)
  }
}
