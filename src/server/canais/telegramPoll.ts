


import { parseUpdate, getUpdates as tgGetUpdates, sendText as tgSendText, answerCallback, setMyCommands as tgSetMyCommands, deleteWebhook as tgDeleteWebhook, type TgEvento } from './telegram'
import { classificarConflito } from '@/lib/telegram/conflito'
import { mdParaHtmlTelegram } from '@/lib/telegram/mdParaHtml'
import { formatarLembretesLista, montarStatus, MSG_AJUDA, COMANDOS_BOT, type LembreteAtivoLike } from '@/lib/telegram/comandos'
import { processarTurnoDono, type OwnerChat } from './telegramTurno'
import { processarCallbackAprovacao, defaultCallbackDeps } from './telegramCallback'
import { validarCodigo, type PairingState } from '@/lib/proativo/pareamento'
import { getSetting, setSetting } from '@/data/settings'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { withTimeout, TimeoutError } from '@/lib/withTimeout'
import { tzSegura } from '@/lib/relogio'

const POLL_TIMEOUT_S = 45
const POLL_LIMIT = 10 







const RAJADA_TIMEOUT_S = 2



const RAJADA_MAX_FETCHES = 3










export const TURNO_TIMEOUT_MS = 330_000



export const MSG_TURNO_TRAVOU =
  'Essa demorou demais do meu lado e eu parei de esperar. O que eu comecei pode terminar sozinho e chegar aqui atrasado, então me pergunte o que ficou pronto antes de pedir de novo.'

export interface PollDeps {
  getToken: () => Promise<string | null>
  getUpdates: (token: string, offset: number, timeoutS: number) => Promise<{ updates: unknown[]; erro: string | null }>
  getSetting: typeof getSetting
  setSetting: typeof setSetting
  processarTurno: (ev: TgEvento, owner: OwnerChat) => Promise<void>
  processarCallback: (ev: Extract<TgEvento, { kind: 'callback' }>, owner: OwnerChat, token: string) => Promise<void>
  recusarCallback: (callbackId: string) => Promise<void>
  responder: (chatId: string, texto: string) => Promise<unknown>
  now: () => string
  
  turnoTimeoutMs?: number
  
  rajadaTimeoutS?: number
  
  
  montarBriefingAgora: () => Promise<string>
  
  listarLembretes: () => Promise<LembreteAtivoLike[]>
  
  getTz: () => Promise<string>
  
  contarAprovacoesPendentes: () => Promise<number>
  contarTarefasAtivas: () => Promise<number>
  
  registrarComandos: () => Promise<void>
  
  limparWebhook: (token: string) => Promise<{ ok: boolean; erro: string | null }>
}

async function buildDefaultDeps(): Promise<PollDeps> {
  const token = await getSecret(SECRET_KEYS.telegram_bot_token)
  return {
    getToken: async () => token,
    getUpdates: (tok, offset, timeoutS) => tgGetUpdates(tok, offset, timeoutS, undefined, POLL_LIMIT),
    getSetting, setSetting,
    processarTurno: (ev, owner) => processarTurnoDono(ev, owner),
    
    
    processarCallback: async (ev, _owner, tok) => processarCallbackAprovacao(ev, await defaultCallbackDeps(tok)),
    recusarCallback: (id) => answerCallback(token ?? '', id, MSG_PRIVADO),
    
    
    responder: (chatId, texto) => tgSendText(token ?? '', chatId, mdParaHtmlTelegram(texto, { linksClicaveis: true }), { parseMode: 'HTML' }),
    now: () => new Date().toISOString(),
    
    
    montarBriefingAgora: async () => (await import('@/server/proativo/dispatcher')).montarBriefingAgora(),
    listarLembretes: async () => (await import('@/data/lembretes')).listarAtivos(),
    getTz: async () => tzSegura(await getSetting('operator_timezone').catch(() => null)),
    contarAprovacoesPendentes: async () => (await import('@/data/approvals')).listPending().then((a) => a.length),
    contarTarefasAtivas: async () => (await import('@/data/tasks')).listLiveTasks().then((t) => t.length),
    registrarComandos: async () => {
      const r = await tgSetMyCommands(token ?? '', [...COMANDOS_BOT])
      if (!r.ok) console.warn('[telegramPoll] setMyCommands falhou (best-effort):', r.erro)
    },
    limparWebhook: (tok) => tgDeleteWebhook(tok),
  }
}

async function lerJson<T>(d: PollDeps, key: string): Promise<T | null> {
  const raw = await d.getSetting(key)
  if (!raw) return null
  try { return JSON.parse(raw) as T } catch { return null }
}

export const MSG_PRIVADO = 'Este bot é privado. Ele atende só o dono desta instância do Awave Agents.'
export const MSG_MIDIA = 'Ainda não consigo abrir esse tipo de arquivo por aqui. Me manda em texto, áudio ou foto?'







export function chatPrivado(chatId: string): boolean {
  return !chatId.startsWith('-')
}







const AVISO_PRIVADO_JANELA_MS = 3_600_000
const AVISO_PRIVADO_MAX = 1_000
export const avisoPrivadoEm = new Map<string, number>()
export function deveAvisarPrivado(chatId: string, agoraMs: number): boolean {
  const ultimo = avisoPrivadoEm.get(chatId)
  if (ultimo !== undefined) {
    if (agoraMs - ultimo < AVISO_PRIVADO_JANELA_MS) return false
    avisoPrivadoEm.delete(chatId) 
  }
  if (avisoPrivadoEm.size > AVISO_PRIVADO_MAX) {
    for (const [id, ts] of avisoPrivadoEm) {
      if (agoraMs - ts >= AVISO_PRIVADO_JANELA_MS) avisoPrivadoEm.delete(id)
    }
  }
  avisoPrivadoEm.set(chatId, agoraMs)
  return true
}




export const MSG_JA_PAREADO = 'Já estamos pareados, pode falar comigo.'
export const MSG_START_SEM_CODIGO =
  'Esse bot é privado. Se você é o dono, gere um código no /config e me mande `/start <código>`.'
export const MSG_CODIGO_EXPIROU = 'Esse código expirou. Gere outro no painel /config e me mande de novo.'
export const MSG_CODIGO_BLOQUEADO = 'Muitas tentativas com esse código. Gere um código novo no /config.'

export const MSG_BOAS_VINDAS = [
  'Pareado ✓. Daqui em diante eu te aviso por aqui.',
  '',
  'Fala comigo como fala com gente: texto, áudio ou foto. Eu transcrevo e enxergo.',
  'Eu respondo em texto e mando imagens geradas. Se quiser resposta em voz, é só me pedir.',
  'Aprovações da empresa chegam com botões: você resolve com 1 toque.',
  'Lembretes em linguagem natural: me lembra amanhã às 9h de pagar o contador.',
  'Manda /ajuda quando quiser rever tudo isso.',
].join('\n')

export const MSG_SEM_COMANDO = 'Pode falar comigo direto, não preciso de comandos.'


export const MSG_COMANDO_FALHOU = 'Não consegui montar isso agora. Tenta de novo?'


async function tratarComandoDono(ev: Extract<TgEvento, { kind: 'comando' }>, d: PollDeps): Promise<void> {
  try {
    if (ev.comando === 'briefing') {
      
      await d.responder(ev.chatId, await d.montarBriefingAgora())
    } else if (ev.comando === 'lembretes') {
      const [ativos, tz] = await Promise.all([d.listarLembretes(), d.getTz()])
      await d.responder(ev.chatId, formatarLembretesLista(ativos, d.now(), tz))
    } else if (ev.comando === 'status') {
      const [aprovacoes, tarefas, lastSeen, ultimoBriefing, tz] = await Promise.all([
        d.contarAprovacoesPendentes(), d.contarTarefasAtivas(),
        d.getSetting('telegram_poll_last_seen'), d.getSetting('briefing_push_last'), d.getTz(),
      ])
      await d.responder(ev.chatId, montarStatus({
        pollLastSeen: lastSeen, aprovacoesPendentes: aprovacoes, tarefasAndamento: tarefas,
        ultimoBriefing, agoraIso: d.now(), tz,
      }))
    } else if (ev.comando === 'ajuda') {
      await d.responder(ev.chatId, MSG_AJUDA)
    } else {
      await d.responder(ev.chatId, MSG_SEM_COMANDO)
    }
  } catch (err) {
    console.warn(`[telegramPoll] comando /${ev.comando} falhou:`, err)
    await d.responder(ev.chatId, MSG_COMANDO_FALHOU)
  }
}

async function tratarComando(ev: Extract<TgEvento, { kind: 'comando' }>, owner: OwnerChat | null, d: PollDeps): Promise<void> {
  if (ev.comando !== 'start') {
    
    if (owner?.chatId === ev.chatId) await tratarComandoDono(ev, d)
    return
  }
  if (owner?.chatId === ev.chatId) {
    await d.responder(ev.chatId, MSG_JA_PAREADO)
    return
  }
  
  if (!chatPrivado(ev.chatId)) return
  
  if (!ev.args.trim()) {
    await d.responder(ev.chatId, MSG_START_SEM_CODIGO)
    return
  }
  const pairing = await lerJson<PairingState>(d, 'telegram_pairing')
  const v = validarCodigo(pairing, ev.args.trim(), d.now())
  if (!v.ok) {
    if (pairing && v.motivo === 'incorreto') {
      await d.setSetting('telegram_pairing', JSON.stringify({ ...pairing, tentativas: pairing.tentativas + 1 }))
    }
    
    
    
    
    if (v.motivo === 'expirado') {
      await d.responder(ev.chatId, MSG_CODIGO_EXPIROU)
      return
    }
    if (v.motivo === 'bloqueado') {
      await d.responder(ev.chatId, MSG_CODIGO_BLOQUEADO)
      return
    }
    
    
    
    if (pairing || deveAvisarPrivado(ev.chatId, Date.parse(d.now()))) {
      await d.responder(ev.chatId, MSG_PRIVADO)
    }
    return
  }
  await d.setSetting('telegram_owner_chat', JSON.stringify({ chatId: ev.chatId, operatorId: pairing!.operatorId, pareadoEm: d.now() }))
  await d.setSetting('telegram_pairing', '') 
  
  
  await d.responder(ev.chatId, MSG_BOAS_VINDAS)
}

export type PollResultado = { disabled: true } | { ok: true; processados: number; erro?: string }
















type Unidade = { ev: TgEvento; maxId: number }

function montarUnidades(eventos: TgEvento[]): Unidade[] {
  const baratos: Unidade[] = []
  const resto: Unidade[] = []
  for (const ev of eventos) {
    if (ev.kind === 'comando' || ev.kind === 'callback') {
      baratos.push({ ev, maxId: ev.updateId })
      continue
    }
    const ultimo = resto[resto.length - 1]
    if (ev.kind === 'texto' && ultimo?.ev.kind === 'texto' && ultimo.ev.chatId === ev.chatId) {
      
      ultimo.ev = { ...ultimo.ev, texto: `${ultimo.ev.texto}\n${ev.texto}`, updateId: Math.max(ultimo.ev.updateId, ev.updateId) }
      ultimo.maxId = Math.max(ultimo.maxId, ev.updateId)
      continue
    }
    resto.push({ ev, maxId: ev.updateId })
  }
  return [...baratos, ...resto]
}





let cicloEmCurso = false





let ultimoErroGravado: string | undefined





export const registroComandos = { feito: false }


export const limpezaWebhook = { feita: false }


export async function pollCiclo(deps?: PollDeps): Promise<PollResultado> {
  if (cicloEmCurso) return { ok: true, processados: 0, erro: 'ciclo_em_curso' }
  cicloEmCurso = true
  try {
    return await executarCiclo(deps)
  } finally {
    cicloEmCurso = false
  }
}

async function executarCiclo(deps?: PollDeps): Promise<PollResultado> {
  const d = deps ?? (await buildDefaultDeps())
  const token = await d.getToken()
  if (!token) return { disabled: true }

  
  
  if (!registroComandos.feito) {
    registroComandos.feito = true
    try {
      void d.registrarComandos().catch((e) => console.warn('[telegramPoll] registrarComandos falhou (sigo):', e))
    } catch (e) { console.warn('[telegramPoll] registrarComandos falhou (sigo):', e) }
  }

  const offsetRaw = await d.getSetting('telegram_update_offset')
  const offset = Number.isFinite(Number(offsetRaw)) && offsetRaw ? Number(offsetRaw) : 0 
  const { updates, erro } = await d.getUpdates(token, offset, POLL_TIMEOUT_S)

  
  
  const erroAtual = erro ?? ''
  if (erroAtual !== ultimoErroGravado) {
    await d.setSetting('telegram_poll_last_error', erroAtual)
    ultimoErroGravado = erroAtual
  }
  if (erro) {
    await d.setSetting('telegram_poll_last_seen', d.now())
    
    
    
    
    
    
    if (!limpezaWebhook.feita && classificarConflito(erro) === 'webhook') {
      limpezaWebhook.feita = true
      const r = await d.limparWebhook(token)
      console.warn('[telegramPoll] 409 de webhook — deleteWebhook automático:', r.ok ? 'ok' : r.erro)
    }
    return { ok: true, processados: 0, erro }
  }

  let processados = 0
  const deadline = d.turnoTimeoutMs ?? TURNO_TIMEOUT_MS
  
  
  
  let confirmado = offset
  
  
  
  let owner = await lerJson<OwnerChat & { pareadoEm: string }>(d, 'telegram_owner_chat')
  let eventos = updates.map(parseUpdate)
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  const donoAtual = owner
  if (donoAtual && eventos.some((e) => e.kind === 'texto' && e.chatId === donoAtual.chatId)) {
    let maiorMesclado = Math.max(...eventos.map((e) => e.updateId))
    for (let fetches = 0; fetches < RAJADA_MAX_FETCHES; fetches++) {
      const extra = await d.getUpdates(token, maiorMesclado + 1, d.rajadaTimeoutS ?? RAJADA_TIMEOUT_S)
      if (extra.erro) {
        console.warn('[telegramPoll] fetch extra da rajada falhou (sigo com o que já tenho):', extra.erro)
        break
      }
      const novos = extra.updates.map(parseUpdate).filter((e) => e.updateId > maiorMesclado)
      if (novos.length === 0) break 
      
      eventos = [...eventos, ...novos]
      maiorMesclado = Math.max(maiorMesclado, ...novos.map((e) => e.updateId))
      
      if (!novos.every((e) => e.kind === 'texto' && e.chatId === donoAtual.chatId)) break
    }
  }
  for (const { ev, maxId } of montarUnidades(eventos)) {
    try {
      if (ev.kind === 'comando') {
        
        
        try {
          await withTimeout(tratarComando(ev, owner, d), deadline, `comando tg ${ev.updateId}`)
        } catch (err) {
          if (!(err instanceof TimeoutError)) throw err
          console.warn(`[telegramPoll] comando estourou o watchdog de ${deadline}ms (update ${ev.updateId}) — seguindo o ciclo`)
        }
        if (ev.comando === 'start') owner = await lerJson<OwnerChat & { pareadoEm: string }>(d, 'telegram_owner_chat')
      } else if (ev.kind === 'callback') {
        if (owner && ev.chatId === owner.chatId) {
          
          
          
          try {
            await withTimeout(d.processarCallback(ev, owner, token), deadline, `callback tg ${ev.updateId}`)
          } catch (err) {
            if (!(err instanceof TimeoutError)) throw err
            console.warn(`[telegramPoll] callback estourou o watchdog de ${deadline}ms (update ${ev.updateId}) — seguindo o ciclo`)
          }
        } else {
          
          await d.recusarCallback(ev.callbackId)
        }
      } else if (ev.kind === 'texto' || ev.kind === 'voz' || ev.kind === 'foto') {
        if (owner && ev.chatId === owner.chatId) {
          
          
          
          
          
          try {
            await withTimeout(d.processarTurno(ev, owner), deadline, `turno tg ${ev.updateId}`)
            processados++
          } catch (err) {
            if (!(err instanceof TimeoutError)) throw err 
            console.warn(`[telegramPoll] turno estourou o watchdog de ${deadline}ms (update ${ev.updateId}) — seguindo o ciclo`)
            await d.responder(ev.chatId, MSG_TURNO_TRAVOU)
          }
        } else if (chatPrivado(ev.chatId) && deveAvisarPrivado(ev.chatId, Date.parse(d.now()))) {
          
          await d.responder(ev.chatId, MSG_PRIVADO)
        }
      } else if (ev.kind === 'nao_suportado') {
        
        
        
        if (owner && ev.chatId === owner.chatId) await d.responder(ev.chatId, MSG_MIDIA)
      }
      
    } catch (err) {
      console.warn(`[telegramPoll] poison update ${ev.updateId} (descartado):`, err)
    }
    
    
    
    
    
    
    
    if (maxId >= 0 && maxId + 1 > confirmado) {
      confirmado = maxId + 1
      await d.setSetting('telegram_update_offset', String(confirmado))
    }
  }
  await d.setSetting('telegram_poll_last_seen', d.now())
  return { ok: true, processados }
}
