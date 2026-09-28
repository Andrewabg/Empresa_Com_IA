
export type StatusMensagem =
  'recebida' | 'rascunho' | 'enviada' | 'entregue' | 'lida' | 'falhou' | 'descartada'
export type StatusMetaEntrega = 'sent' | 'delivered' | 'read' | 'failed'

const JANELA_MS = 24 * 60 * 60 * 1000


export function podeEnviarLivre(ultimaMsgInAt: string | null, agoraIso: string): boolean {
  if (!ultimaMsgInAt) return false
  return Date.parse(agoraIso) - Date.parse(ultimaMsgInAt) < JANELA_MS
}


export function maisRecenteEntre<T>(
  entradas: readonly { item: T; em: string | null | undefined }[],
): { item: T; em: string } | null {
  let escolhida: { item: T; em: string } | null = null
  let maior = Number.NEGATIVE_INFINITY
  for (const e of entradas) {
    if (!e.em) continue
    const ms = Date.parse(e.em)
    if (!Number.isFinite(ms) || ms <= maior) continue
    maior = ms
    escolhida = { item: e.item, em: e.em }
  }
  return escolhida
}


export function precisaJanela(janela24h: boolean, ultimaMsgInAt: string | null, agora: string): boolean {
  return janela24h ? !podeEnviarLivre(ultimaMsgInAt, agora) : false
}

const ORDEM: Partial<Record<StatusMensagem, number>> = { enviada: 1, entregue: 2, lida: 3 }


export function aplicarStatusEntrega(atual: StatusMensagem, evento: StatusMetaEntrega): StatusMensagem {
  const pos = ORDEM[atual]
  if (pos === undefined) return atual
  if (evento === 'failed') return 'falhou'
  const alvo: StatusMensagem = evento === 'read' ? 'lida' : evento === 'delivered' ? 'entregue' : 'enviada'
  return (ORDEM[alvo] ?? 0) > pos ? alvo : atual
}
