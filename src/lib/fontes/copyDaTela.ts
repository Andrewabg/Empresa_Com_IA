















export const TEXTOS_FONTES = {
  
  tituloSecao: 'Fontes de dados',
  descricaoSecao:
    'Ligue o banco de dados do seu negócio e eu passo a saber o que ele sabe. Eu leio no horário que você marcar, guardo o resultado como nota no seu Cérebro e uso isso quando você me perguntar alguma coisa.',
  tituloCard: 'Fontes de dados',
  introCard:
    'Eu só rodo as perguntas que você aprovar, no horário que você marcar. Cada resposta vira uma nota no seu Cérebro, sempre em contagens e totais, nunca a lista de pessoas.',

  
  rotuloNome: 'Nome desta fonte',
  placeholderNome: 'Banco da loja',
  rotuloConexao: 'Conexão de leitura do banco',
  placeholderConexao: 'postgres://usuario:senha@endereco:5432/nome-do-banco',
  
  ajudaSomenteLeitura:
    'Use a conexão de um usuário que só consegue LER o seu banco. Com ela, nada do seu negócio pode ser alterado ou apagado por mim, nem se uma consulta sair errada. Peça ao responsável pelo seu banco um acesso de leitura, e não cole aqui o acesso de administrador. O passo a passo para criar esse acesso está no guia de instalação.',
  
  ajudaConexaoCriptografada:
    'Por padrão eu só me conecto de forma criptografada e confiro o certificado de segurança do seu banco, para a sua senha e os dados do seu negócio não passarem visíveis pela rede nem caírem na mão de quem estiver no meio do caminho. Se o seu banco usa um certificado próprio e recusa a conexão por causa disso, acrescente ?sslmode=no-verify ao final dela. Se o banco roda só na sua própria máquina, sem sair para a internet, acrescente ?sslmode=disable para dispensar a criptografia. Se a sua conexão já tiver um ? em algum lugar, use & no lugar do ? nesses dois acréscimos.',
  
  abrirGuia: 'Abrir o guia de instalação',
  botaoConectar: 'Conectar',
  conectando: 'Conectando…',
  faltaPreencherConexao: 'Preencha o nome e a conexão antes de conectar.',

  
  carregando: 'Carregando suas fontes…',
  nenhumaFonte: 'Você ainda não ligou nenhum banco. Conecte o primeiro no formulário acima.',
  falhaLeitura:
    'Não deu para carregar suas fontes agora. Recarregue a página em alguns instantes.',
  somenteDono: 'Só o dono da empresa pode ligar um banco de dados.',
  
  falhaAoSalvar:
    'Não deu para concluir agora. O que você pediu pode já ter sido salvo, então confira a lista abaixo antes de tentar outra vez.',

  
  fonteLigada: 'Ligada',
  fonteDesligada: 'Desligada',
  botaoDesligar: 'Desligar',
  botaoLigar: 'Ligar',
  botaoRemover: 'Remover',
  
  ligando: 'Ligando…',
  desligando: 'Desligando…',
  removendo: 'Removendo…',
  
  rotuloUltimoErro: 'A última leitura desta fonte falhou:',
  
  rotuloUltimoErroDaConsulta: 'A última vez que eu rodei esta pergunta falhou:',
  
  rotuloAvisoDaFonte: 'Uma coisa que eu não consegui conferir nesta fonte:',
  confirmarRemoverFonte:
    'Remover esta fonte? Isso apaga a conexão guardada e todas as perguntas dela. As notas que já foram para o seu Cérebro continuam lá.',

  
  botaoReconhecer: 'Ver o que dá para saber',
  reconhecendo: 'Olhando o seu banco…',
  
  ajudaReconhecer:
    'Eu olho a estrutura do seu banco e sugiro as perguntas que valem a pena. Você escolhe quais quer, e nenhuma roda antes de você aprovar. Cada vez que você pede isso, eu uso a sua chave de IA, então vale pedir uma vez e escolher com calma.',
  tituloPropostas: 'Perguntas que eu sugiro',
  
  nadaAPropor:
    'Eu não achei nenhuma pergunta para sugerir neste banco desta vez. Isso costuma acontecer quando o usuário da conexão não enxerga nenhuma tabela.',
  tituloRecusadas: 'O que eu descartei, e por quê',
  rotuloConsultaCrua: 'A consulta que eu vou rodar',
  rotuloMotivo: 'Por que vale a pena',
  rotuloQuando: 'Quando rodar',
  rotuloHorario: 'Horário',
  rotuloDiaDaSemana: 'Dia da semana',
  rotuloDiaDoMes: 'Dia do mês',
  rotuloDestino: 'Onde eu guardo a resposta',
  botaoAdicionar: 'Adicionar as marcadas',
  adicionando: 'Adicionando…',
  nenhumaMarcada: 'Marque pelo menos uma pergunta antes de adicionar.',

  
  tituloConsultas: 'Perguntas desta fonte',
  nenhumaConsulta:
    'Esta fonte ainda não tem nenhuma pergunta. Use o botão acima para eu sugerir algumas.',
  esperandoAprovacao: 'Esperando a sua aprovação',
  aprovada: 'Aprovada',
  
  ajudaAprovar:
    'Aprovar libera esta pergunta para rodar sozinha no horário marcado, sempre, até você desligar. Leia a consulta acima antes.',
  botaoAprovar: 'Aprovar',
  aprovando: 'Aprovando…',
  botaoTestar: 'Testar',
  testando: 'Testando…',
  ajudaTestar: 'Testar roda a consulta uma vez agora e me mostra o que ela devolve. Nada é guardado.',
  tituloResultadoDoTeste: 'O que essa consulta devolve agora',
  resultadoVazio: 'A consulta rodou e não devolveu nenhuma linha.',
  aindaNaoRodou: 'Ainda não rodou.',
  rotuloUltimaExecucao: 'Rodou pela última vez em',
  confirmarRemoverConsulta:
    'Remover esta pergunta? Ela para de rodar. A nota que ela já criou continua no seu Cérebro.',
} as const


export const URL_GUIA_INSTALACAO = 'https://elitedaia.com.br/guia/empresa-ia'


export const MENSAGENS_COM_EFEITO: readonly string[] = [TEXTOS_FONTES.falhaAoSalvar]


export const OPCOES_DE_FREQUENCIA = [
  { valor: 'diaria', rotulo: 'Todo dia' },
  { valor: 'semanal', rotulo: 'Toda semana' },
  { valor: 'mensal', rotulo: 'Todo mês' },
] as const


export const DIAS_DA_SEMANA = [
  'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado',
] as const
