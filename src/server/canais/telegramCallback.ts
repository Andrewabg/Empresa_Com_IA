

import { resolverAprovacao, type Resolucao } from '@/server/approvals/resolver'
import { answerCallback as tgAnswer, editMessageText as tgEdit, type TgEvento } from './telegram'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { getSetting } from '@/data/settings'
import { validarTz, TZ_DEFAULT } from '@/server/proativo/dispatcher'

export interface CallbackDeps {
  resolver: (id: string, action: 'approve' | 'reject') => Promise<Resolucao>
  answerCallback: (callbackId: string, texto?: string) => Promise<void>
  editMessage: (chatId: string, messageId: number, texto: string) => Promise<void>
  agora: () => string 
}

export async function defaultCallbackDeps(token?: string): Promise<CallbackDeps> {
  
  const tok = token ?? (await getSecret(SECRET_KEYS.telegram_bot_token)) ?? ''
  
  
  const tz = validarTz((await getSetting('operator_timezone')) ?? TZ_DEFAULT)
  return {
    resolver: resolverAprovacao,
    answerCallback: (id, t) => tgAnswer(tok, id, t),
    editMessage: (c, m, t) => tgEdit(tok, c, m, t),
    agora: () => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(new Date()),
  }
}

const RE_APR = /^apr:([^:]+):(ok|no)$/

export async function processarCallbackAprovacao(
  ev: Extract<TgEvento, { kind: 'callback' }>, deps?: CallbackDeps,
): Promise<void> {
  const d = deps ?? (await defaultCallbackDeps())
  const m = ev.data.match(RE_APR)
  if (!m) { await d.answerCallback(ev.callbackId); return }
  const [, id, verbo] = m
  const action = verbo === 'ok' ? 'approve' : 'reject'
  
  
  
  await d.answerCallback(ev.callbackId, 'Processando…')
  const r = await d.resolver(id, action)
  if (!r.ok) {
    
    
    const msg = (r.motivo === 'permanente' ? r.mensagem
      : r.motivo === 'needs_config' ? 'Cérebro não configurado. Resolve pelo painel.'
      : r.motivo === 'composio_off' ? 'Composio não configurado. Resolve pelo painel.'
      : r.motivo === 'not_found' ? 'Aprovação não encontrada.'
      : 'Não consegui concluir agora. Tenta outra vez.').slice(0, 200)
    
    
    
    await d.answerCallback(ev.callbackId, msg)
    return
  }
  const original = ev.messageText ?? 'Aprovação'
  
  const selo = r.jaResolvida ? '⚠️ Essa aprovação já foi resolvida.'
    : action === 'approve' ? `✅ Aprovado às ${d.agora()}` : `❌ Rejeitado às ${d.agora()}`
  await d.editMessage(ev.chatId, ev.messageId, `${original}\n\n${selo}`)
}
