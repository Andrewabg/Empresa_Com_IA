


















export type LeituraDaInscricao = 'inscrito' | 'nao_inscrito' | 'credencial_recusada' | 'nao_sei'

export type EstadoDaConexao = 'ok' | 'caiu' | 'credencial'

export const TEXTOS_CONEXAO: Record<'caiu' | 'credencial', string> = {
  caiu: 'A conta de Instagram parou de avisar sobre comentários novos, então as automações não estão respondendo a ninguém. Abra a tela de configuração e clique em Conferir para inscrever a conta de novo.',
  
  credencial: 'A Meta não aceita mais o acesso desta conta de Instagram, então as automações pararam de responder. Gere um acesso novo da página no painel da Meta e cole na tela de configuração.',
}

export function avaliarConexao(input: { leitura: LeituraDaInscricao }): EstadoDaConexao {
  
  
  if (input.leitura === 'credencial_recusada') return 'credencial'
  return input.leitura === 'nao_inscrito' ? 'caiu' : 'ok'
}


export const TTL_CONEXAO_MS = 6 * 60 * 60 * 1000


export function estadoMedidoAnterior(config: unknown): EstadoDaConexao | null {
  const v = (config as { ig_conexao_estado?: unknown } | null)?.ig_conexao_estado
  return v === 'ok' || v === 'caiu' || v === 'credencial' ? v : null
}


export function pioraNaBorda(
  anterior: EstadoDaConexao | null, novo: EstadoDaConexao,
): novo is 'caiu' | 'credencial' {
  return novo !== 'ok' && novo !== anterior
}


export const LEITURA_CONEXAO_MAX_IDADE_MS = 24 * 60 * 60 * 1000


export function estadoConexaoArmazenado(
  config: unknown,
  agoraIso: string,
  maxIdadeMs: number = LEITURA_CONEXAO_MAX_IDADE_MS,
): EstadoDaConexao | null {
  const c = config as { ig_conexao_estado?: unknown; ig_conexao_lida_em?: unknown } | null
  const estado = c?.ig_conexao_estado
  
  
  if (estado !== 'ok' && estado !== 'caiu' && estado !== 'credencial') return null

  const lidaEm = c?.ig_conexao_lida_em
  if (typeof lidaEm !== 'string') return null
  const em = Date.parse(lidaEm)
  const agora = Date.parse(agoraIso)
  if (!Number.isFinite(em) || !Number.isFinite(agora)) return null
  if (em > agora || agora - em >= maxIdadeMs) return null

  return estado
}


export function lerConexaoArmazenada(
  config: unknown,
  agoraIso: string,
  maxIdadeMs: number = LEITURA_CONEXAO_MAX_IDADE_MS,
): { estado: EstadoDaConexao | null; recebe: boolean | null; credencialRecusada: boolean } {
  const estado = estadoConexaoArmazenado(config, agoraIso, maxIdadeMs)
  return {
    estado,
    recebe: estado === null ? null : estado === 'ok',
    credencialRecusada: estado === 'credencial',
  }
}
