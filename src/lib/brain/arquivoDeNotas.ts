


export const PASTA_ARQUIVO = '_arquivo/'


export function caminhoArquivado(path: string): string {
  return estaArquivada(path) ? path : `${PASTA_ARQUIVO}${path}`
}


export function estaArquivada(path: string): boolean {
  return path.startsWith(PASTA_ARQUIVO)
}




export const AVISO_CAMINHO_INVALIDO = 'Não reconheço essa nota.'


export const AVISO_JA_ARQUIVADA = 'Essa nota já está arquivada.'


export const AVISO_NAO_ENCONTRADA = 'Essa nota não está mais no Cérebro.'


export const AVISO_NAO_ARQUIVOU =
  'A nota continua como estava: não consegui arquivar direto agora, e coloquei o pedido na fila de Aprovações para você decidir.'


export const AVISO_DESTINO_OCUPADO = 'Já existe uma nota arquivada nesse mesmo caminho, e nada foi alterado.'


export const AVISO_ERRO_AO_ARQUIVAR = 'Não consegui arquivar essa nota agora.'


export const AVISO_CEREBRO_INDISPONIVEL =
  'O Cérebro não respondeu agora. Sua nota não foi arquivada, tente daqui a pouco.'


export const CONFIRMAR_ARQUIVAR =
  'Arquivar esta nota? Ela sai da lista e da busca dos seus agentes, mas continua guardada no seu Cérebro com o histórico completo.'


export const AVISO_SEM_RESPOSTA_DO_SERVIDOR = 'Não consegui falar com o servidor. Sua nota não foi arquivada.'


export const AVISO_INDICE_ATRASADO =
  'Arquivada. Seus agentes podem levar alguns minutos para parar de ver esta nota.'
