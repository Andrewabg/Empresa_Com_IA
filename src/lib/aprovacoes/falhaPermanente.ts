


export const COPY_FALHA_GENERICA =
  'Não consegui concluir essa ação agora. Tente aprovar ou recusar outra vez.'


export type MotivoPermanente = 'tool_removida' | 'formato_mudou'


export function copyDaFalhaPermanente(motivo: MotivoPermanente, tool: string): string {
  const nome = tool.trim() || 'essa ferramenta'
  if (motivo === 'tool_removida') {
    return `A ferramenta "${nome}" não está mais na pasta custom desta instalação, então este pedido não tem como rodar. Nada foi executado. Recuse o pedido e peça de novo ao agente.`
  }
  return `A ferramenta "${nome}" mudou o formato dos dados que recebe depois que este pedido nasceu, então ele não tem como rodar. Nada foi executado. Recuse o pedido e peça de novo ao agente.`
}


export class FalhaPermanenteDaAprovacao extends Error {
  readonly motivo: MotivoPermanente
  
  readonly mensagem: string

  constructor(motivo: MotivoPermanente, tool: string) {
    const mensagem = copyDaFalhaPermanente(motivo, tool)
    super(mensagem)
    this.name = 'FalhaPermanenteDaAprovacao'
    this.motivo = motivo
    this.mensagem = mensagem
  }
}


export const COPY_SO_DONO_DECIDE = 'Quem decide aqui é o dono da conta. Você vê o pedido, mas a aprovação é dele.'
