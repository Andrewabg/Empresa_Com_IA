






export const TEXTOS_COCKPIT_IG = {
  subtitulo: 'Automações de comentário nas publicações da sua conta.',
  abrindoAutomacao: 'Abrindo a automação…',
  novaAutomacao: 'Nova automação',
  abrirConfiguracoes: 'Abrir configurações',

  semCanalTitulo: 'Conecte o Instagram',
  semCanalTexto: 'Para criar automações, conecte sua conta de Instagram nas configurações.',
  semAutomacaoTitulo: 'Nenhuma automação ainda',
  semAutomacaoTexto: 'Crie a primeira: escolha em qual publicação um comentário dispara a automação e o que ela responde.',
  criarPrimeira: 'Criar a primeira',

  
  naoSalvou: 'Não consegui salvar a automação agora.',
  
  semRedeAoSalvar: 'Sem conexão com o servidor. Nada foi enviado ainda, então pode tentar salvar mais uma vez.',
  naoMudouEstado: 'Não consegui mudar o estado desta automação.',
  naoArquivou: 'Não consegui arquivar esta automação.',
  naoAbriu: 'Não consegui abrir esta automação agora.',

  
  canalDesligado: 'Este canal está desligado nas configurações. As automações ficam paradas enquanto ele estiver assim: ligue o Instagram nas configurações para elas voltarem a funcionar.',
  
  automacaoParadaPeloCanal: 'O canal do Instagram está desligado nas configurações, então esta automação não vai disparar enquanto ele estiver assim.',

  
  pausar: 'Pausar',
  ativar: 'Ativar',
  editar: 'Editar',
  historico: 'Histórico',
  arquivar: 'Arquivar',
  arquivarPergunta: 'Arquivar?',
  arquivarCancelar: 'Não',
  
  arquivarEDefinitivo: 'Some da lista, e o painel não traz de volta.',

  
  expiradaTemSaida: 'Esta automação venceu junto com o story. Abra, troque o disparo para comentário em uma publicação e salve: ela volta a ser um rascunho e o botão de ativar reaparece.',

  irParaLoja: 'Ir para a Loja',

  
  historicoCarregando: 'Carregando o histórico…',
  historicoFalhou: 'Não deu para carregar o histórico agora',
  historicoFalhouSub: 'Tente mais tarde.',
  semDisparo: 'Nenhum disparo ainda',
  semDisparoSub: 'Assim que alguém comentar na publicação, o disparo aparece aqui.',
  semUsuario: 'pessoa sem @ registrado',

  
  escolhaPublicacao: 'Escolha a publicação',
  publicacoesCarregando: 'Carregando suas publicações…',
  publicacoesFalharam: 'Não deu para carregar suas publicações agora',
  publicacoesFalharamSub: 'Tente mais tarde.',
  publicacoesSemCanal: 'Conecte a conta de Instagram nas configurações antes de escolher uma publicação.',
  semPublicacao: 'Não encontramos publicações agora',
  semPublicacaoSub: 'Se você acabou de publicar, o Instagram pode levar um instante para mostrar a publicação aqui.',
} as const


export const ROTULO_GATILHO_IG = {
  comentario: 'Comentário em publicação',
  story: 'Resposta a story',
  palavra_no_direct: 'Mensagem direta',
} as const


export const ROTULO_ESTADO_IG = {
  rascunho: 'Rascunho, ainda não responde a ninguém',
  ativa: 'Ativa',
  expirada: 'Expirada, o story venceu',
  arquivada: 'Arquivada',
} as const


export function tituloDoHistorico(nomeDaAutomacao: string): string {
  return `Histórico de ${nomeDaAutomacao}`
}


export function tituloContratarCargo(cargoNome: string): string {
  return `Contrate a ${cargoNome} na Loja`
}

export function textoContratarCargo(cargoNome: string): string {
  return `A ${cargoNome} cuida das automações de comentário nas publicações do seu Instagram. Instale o cargo na Loja para começar.`
}


export function rotuloFalarCom(cargoNome: string): string {
  return `Falar com a ${cargoNome}`
}
