








const COLUNA_POR_TABELA: Record<string, string> = {
  mensagens_externas: 'conversa_id',
  conversas_externas: 'id',
}


export function conversaDoEvento(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as { table?: unknown; new?: unknown }
  const tabela = typeof p.table === 'string' ? p.table : ''
  const coluna = COLUNA_POR_TABELA[tabela]
  if (!coluna) return null
  const linha = p.new
  if (!linha || typeof linha !== 'object') return null
  const valor = (linha as Record<string, unknown>)[coluna]
  return typeof valor === 'string' && valor.trim() ? valor : null
}


export function eventoTocaConversaAberta(conversaDoEvento: string | null, abertaId: string | null): boolean {
  if (!abertaId) return false
  if (!conversaDoEvento) return true
  return conversaDoEvento === abertaId
}
