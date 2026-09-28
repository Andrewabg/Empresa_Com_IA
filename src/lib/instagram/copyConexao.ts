









export const TEXTOS_CONEXAO_IG = {
  semApp: 'Crie o aplicativo da Meta e adicione o produto Instagram a ele. Depois volte aqui com a credencial de acesso da página.',
  reusaWhatsapp: 'Você já conectou o WhatsApp, então o aplicativo da Meta já existe. Falta só gerar uma credencial de acesso da página com as permissões de Instagram e colar aqui.',
  
  
  
  naoRecebe: 'A conta está conectada, mas a página ainda não está liberada para responder. Clique em Conferir para liberar de novo.',
  
  credencialRecusada: 'A Meta não aceita mais o acesso desta conta, então as automações pararam de responder. Reconferir não resolve: é preciso gerar um acesso novo da página no painel da Meta e salvá-lo na tela de configuração.',
  semAppSecret: 'Falta a chave secreta do aplicativo da Meta. Sem ela o Instagram não consegue entregar os comentários aqui. Copie a chave secreta em Configurações do aplicativo, no painel da Meta, e cole no campo abaixo.',
  conectado: 'Instagram conectado e liberado para responder',
  
  validadeNaoConferivel: 'Esta tela não sabe dizer quando o acesso ao Instagram vence: a Meta só conta isso a quem tem a credencial do aplicativo dela, e aqui fica a credencial da conta. O acesso costuma durar cerca de dois meses. Quando ele parar de valer, esta linha vira um aviso pedindo para você reconectar a conta.',
  desconectado: 'Instagram não conectado',
  parcial: 'Instagram conectado, mas ainda não pode responder',
  indefinido: 'Não deu para conferir agora. Tente de novo em alguns minutos.',
  
  falhaLeitura: 'Não deu para conferir a conexão do Instagram agora. Recarregue a página em alguns instantes.',
  
  falhaConexao: 'Não deu para concluir a conexão agora. Parte do que você enviou pode já ter sido salva, então confira o diagnóstico acima antes de tentar outra vez.',
  
  somenteDono: 'Só o dono da empresa pode conectar o Instagram.',
  
  camposObrigatorios: 'Informe a credencial de acesso da página e o id da conta.',
  
  erroAoConectar: 'Não deu para conectar a conta agora.',
  
  conectadoAgora: 'Conta conectada. Confira o diagnóstico acima: ele diz se ainda falta algum passo.',
  
  avisoAntesDeTrocar: 'Ao conectar outra conta, todas as suas automações param de responder, porque cada uma está presa a uma publicação da conta atual. Elas continuam salvas aqui, e voltam ao ar quando você abrir cada uma, escolher uma publicação da conta nova e ativar. As de um tipo de disparo antigo pedem um passo a mais, que a tela explica na hora.',
  
  trocouDeConta: 'A conta nova está conectada. Todas as suas automações pararam de responder, porque cada uma está presa a uma publicação da conta anterior. Abra cada uma, escolha uma publicação da conta nova e ative: ao editar, ela volta para rascunho, então confirme a ativação no fim. Se alguma tiver um tipo de disparo antigo, que a tela não cria mais, troque o disparo para comentário em uma publicação na mesma tela e escolha a publicação: ela passa a responder a quem comentar ali.',
  
  credencialJaSalva: 'Já existe uma credencial salva. Preencha os dois campos apenas se for trocá-la para conectar outra conta. Para reconferir a que já está salva, use o botão Conferir.',
  
  contaNaoEncontrada: 'Não encontrei essa conta de Instagram com a credencial que você colou. Confira o id da conta e a credencial da página: as duas precisam ser da mesma conta, e a credencial pode ter vencido. Nada foi alterado, e a conta que já estava conectada segue como estava.',
  
  idJaEmUso: 'Essa conta já está guardada em outro canal desta instalação, e esse canal tem automações salvas dentro. Não alterei nada, para não apagar o trabalho que está lá.',
  
  oQueEstaTelaFaz: 'Conectada a conta, os comentários das suas publicações chegam aqui e as automações que você criar no painel de Instagram respondem sozinhas a quem comentou. Esta tela cuida só da conexão; as automações ficam no painel de Instagram.',
  
  canalNaLista: 'Desligar aqui para todas as automações de uma vez: os comentários continuam sendo guardados e ninguém recebe resposta. As automações em si ficam no painel de Instagram.',
  
  falhaAoAlternarCanal: 'Não deu para mudar o interruptor do canal agora. Nada foi alterado; recarregue a página e tente mais uma vez.',
  canalAtivo: 'ativo',
  canalInativo: 'inativo',
  ligarCanal: 'Ativar',
  desligarCanal: 'Desativar',
  
  eventoTrocaDeConta: 'Instagram: a conta conectada mudou. As automações precisam de uma publicação nova para voltar a responder.',
} as const

export interface EstadoConexaoIg {
  temToken: boolean
  temWhatsapp: boolean
  
  temAppSecret: boolean
  
  recebe: boolean | null
  
  credencialRecusada?: boolean
  
  codigoDaMeta?: number | null
}


function sufixoDoCodigo(codigo: number | null | undefined): string {
  return typeof codigo === 'number' ? ` O Instagram devolveu o código ${codigo}.` : ''
}

export function diagnosticoDaConexao(input: EstadoConexaoIg): { titulo: string; passo: string } {
  if (!input.temToken) {
    return {
      titulo: TEXTOS_CONEXAO_IG.desconectado,
      passo: input.temWhatsapp ? TEXTOS_CONEXAO_IG.reusaWhatsapp : TEXTOS_CONEXAO_IG.semApp,
    }
  }
  
  
  if (!input.temAppSecret) {
    return { titulo: TEXTOS_CONEXAO_IG.parcial, passo: TEXTOS_CONEXAO_IG.semAppSecret }
  }
  if (input.recebe === true) {
    return { titulo: TEXTOS_CONEXAO_IG.conectado, passo: '' }
  }
  
  
  if (input.credencialRecusada) {
    return { titulo: TEXTOS_CONEXAO_IG.parcial, passo: TEXTOS_CONEXAO_IG.credencialRecusada }
  }
  if (input.recebe === false) {
    
    
    
    return {
      titulo: TEXTOS_CONEXAO_IG.parcial,
      passo: `${TEXTOS_CONEXAO_IG.naoRecebe}${sufixoDoCodigo(input.codigoDaMeta)}`,
    }
  }
  return { titulo: TEXTOS_CONEXAO_IG.parcial, passo: TEXTOS_CONEXAO_IG.indefinido }
}
