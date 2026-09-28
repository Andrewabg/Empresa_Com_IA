
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { getSetting } from '@/data/settings'
import { editMessageText } from '@/server/canais/telegram'
import { validarTz, TZ_DEFAULT } from '@/lib/tempo/fusoDoDono'
import type { Approval } from '@/data/approvals'

export interface EspelharDeps {
  editMessage: (chatId: string, messageId: number, texto: string) => Promise<void>
  
  agora: () => string
}

async function defaultDeps(): Promise<EspelharDeps> {
  const token = (await getSecret(SECRET_KEYS.telegram_bot_token)) ?? ''
  const tz = validarTz((await getSetting('operator_timezone')) ?? TZ_DEFAULT)
  return {
    
    
    editMessage: async (chatId, messageId, texto) => {
      if (!token) return
      await editMessageText(token, chatId, messageId, texto)
    },
    agora: () => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(new Date()),
  }
}



export const SELO_APROVADO_PAINEL = (hora: string): string => `✅ Aprovado no painel às ${hora}`
export const SELO_REJEITADO_PAINEL = (hora: string): string => `❌ Rejeitado no painel às ${hora}`


export async function espelharDecisaoNoTelegram(
  approval: Pick<Approval, 'telegram_chat_id' | 'telegram_message_id' | 'status'>,
  deps?: EspelharDeps,
): Promise<void> {
  try {
    if (!approval.telegram_chat_id || !approval.telegram_message_id) return
    if (approval.status !== 'approved' && approval.status !== 'rejected') return
    const d = deps ?? (await defaultDeps())
    const texto = approval.status === 'approved'
      ? SELO_APROVADO_PAINEL(d.agora())
      : SELO_REJEITADO_PAINEL(d.agora())
    await d.editMessage(approval.telegram_chat_id, approval.telegram_message_id, texto)
  } catch (e) {
    console.warn('[approvals/telegramMirror] espelhar falhou (fail-open):', e)
  }
}
