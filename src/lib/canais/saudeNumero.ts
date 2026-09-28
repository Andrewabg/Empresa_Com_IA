





import type { SaudeNumero } from '@/server/canais/types'


export const TTL_SAUDE_MS = 6 * 60 * 60 * 1000


export function lerSaudeConfig(config: unknown): SaudeNumero | null {
  const raw = (config as { saude?: unknown } | null)?.saude
  if (!raw || typeof raw !== 'object') return null
  const s = raw as { qualidade?: unknown; limite?: unknown; nome?: unknown; recebe?: unknown; em?: unknown }
  const q = s.qualidade
  if (q !== 'GREEN' && q !== 'YELLOW' && q !== 'RED' && q !== 'UNKNOWN') return null
  if (typeof s.em !== 'string' || !Number.isFinite(Date.parse(s.em))) return null
  return {
    qualidade: q,
    limite: typeof s.limite === 'string' ? s.limite : null,
    nome: typeof s.nome === 'string' ? s.nome : null,
    
    
    recebe: typeof s.recebe === 'boolean' ? s.recebe : null,
    em: s.em,
  }
}


export function entradaMuda(saude: SaudeNumero | null): boolean {
  return saude?.recebe === false
}


export const AVISO_ENTRADA_MUDA =
  'Este número envia, mas não recebe: o aplicativo não está inscrito na sua conta do WhatsApp Business, então a Meta não entrega as respostas dos clientes (e não guarda o que já foi perdido). Abra o painel, em Canais, e clique em Vincular no número para religar a entrada.'


export function precisaLerSaude(atual: SaudeNumero | null, agoraIso: string, ttlMs = TTL_SAUDE_MS): boolean {
  if (!atual) return true
  const agora = Date.parse(agoraIso)
  const em = Date.parse(atual.em)
  if (!Number.isFinite(agora) || !Number.isFinite(em)) return true
  
  
  return agora - em >= ttlMs || em > agora
}


export function caiuParaVermelho(anterior: SaudeNumero | null, nova: SaudeNumero): boolean {
  return nova.qualidade === 'RED' && anterior?.qualidade !== 'RED'
}

export const QUALIDADE_LABEL: Record<SaudeNumero['qualidade'], string> = {
  GREEN: 'boa',
  YELLOW: 'em atenção',
  RED: 'ruim',
  UNKNOWN: 'sem informação',
}


export function conselhoQualidade(q: SaudeNumero['qualidade']): string {
  if (q === 'RED') {
    return 'A Meta pode limitar ou bloquear o envio deste número. Pare campanhas em massa, responda só quem escreveu primeiro e evite mensagens que gerem bloqueio.'
  }
  if (q === 'YELLOW') {
    return 'Alguns clientes marcaram suas mensagens como indesejadas. Reduza envios não solicitados antes que a Meta limite o número.'
  }
  return ''
}
