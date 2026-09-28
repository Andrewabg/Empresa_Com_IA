






import type { BotaoInline } from '@/server/canais/telegram'

const EMOJI: Record<string, string> = {
  aprovacao: '🔔', atendimento_escalado: '🙋', tarefa_falhou: '⚠️', plano_falhou: '⚠️',
  tarefa_concluida: '✅', plano_concluido: '✅', lembrete: '⏰', anomalia_trafego: '📉',
  memoria_perdida: '🧠', prazo_juridico: '⚖️',
}

export interface NotificacaoLike { tipo: string; titulo: string; corpo: string; payload: Record<string, unknown> }
export interface MensagemRenderizada { texto: string; teclado?: BotaoInline[][] }


export function citar(texto: string): string {
  return (texto ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => (l.trim() ? `> ${l.trim()}` : '>'))
    .join('\n')
}

export function renderNotificacao(n: NotificacaoLike, appUrl: string | null): MensagemRenderizada {
  
  
  
  
  
  const titulo = (n.titulo ?? '').replace(/\s+/g, ' ').trim()
  const texto = `# ${EMOJI[n.tipo] ?? '📌'} ${titulo}\n\n${n.corpo}`.trim()
  if (n.tipo === 'aprovacao') {
    const id = typeof n.payload.approval_id === 'string' ? n.payload.approval_id : null
    if (!id) return { texto }
    const teclado: BotaoInline[][] = [[
      { texto: '✅ Aprovar', callbackData: `apr:${id}:ok` },
      { texto: '❌ Rejeitar', callbackData: `apr:${id}:no` },
    ]]
    if (appUrl) teclado.push([{ texto: '🔎 Ver no painel', url: `${appUrl.replace(/\/$/, '')}/aprovacoes` }])
    return { texto, teclado }
  }
  return { texto }
}
