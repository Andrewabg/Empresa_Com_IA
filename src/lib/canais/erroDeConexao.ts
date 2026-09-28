












export type MotivoErroDeConexao = 'nome_em_uso' | 'servidor_recusou' | 'desconhecido'


export function classificarErroDeConexao(erro: unknown): MotivoErroDeConexao {
  const t = (erro instanceof Error ? erro.message : String(erro ?? '')).toLowerCase()
  if (t.includes('duplicate key') || t.includes('canais_external_id_key')) return 'nome_em_uso'
  if (
    t.includes('instance/create') || t.includes('instance/connect') ||
    t.includes('configurar webhook') || t.includes('sem nome de instância') || t.includes('sem o qr')
  ) {
    return 'servidor_recusou'
  }
  return 'desconhecido'
}

export const LEGENDA_NOME_EM_USO =
  'Já existe um canal com esse nome. Use o QR do canal que está na lista abaixo, ou escolha outro nome para criar um segundo.'


export const ACAO_CONECTAR = 'conectar esse canal'
export const ACAO_RECONECTAR = 'gerar um QR novo para esse canal'
export const ACAO_STATUS = 'consultar esse canal'
export const ACAO_DESCONECTAR = 'desconectar esse canal'


export const ACAO_REMOVER = 'remover esse canal'
export const ACAO_MODO_TESTE = 'salvar o modo teste desse canal'


export function legendaDoErroDeConexao(erro: unknown, oQueFalhou: string = ACAO_CONECTAR): string {
  const motivo = classificarErroDeConexao(erro)
  if (motivo === 'nome_em_uso') return LEGENDA_NOME_EM_USO
  if (motivo === 'servidor_recusou') {
    return `O servidor UAZAPI recusou o pedido, então não consegui ${oQueFalhou}. Confira o endereço do servidor e a chave de admin.`
  }
  return `Não consegui ${oQueFalhou} agora. Confira os dados de acesso ao servidor UAZAPI e tente outra vez.`
}


export function legendaDoErroDoCanal(erro: unknown, oQueFalhou: string): string {
  if (classificarErroDeConexao(erro) === 'nome_em_uso') return LEGENDA_NOME_EM_USO
  return `Não consegui ${oQueFalhou} agora. Tente outra vez em instantes.`
}
