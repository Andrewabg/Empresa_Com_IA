








export const ERRO_CONEXAO_RECUSADA =
  'O banco recusou a conexão. Confira o endereço e a porta, e libere o acesso do servidor da sua empresa no firewall do banco.'

export const ERRO_ENDERECO_NAO_ENCONTRADO =
  'Não encontrei esse endereço de banco. Confira se o endereço está escrito certo na conexão.'

export const ERRO_CREDENCIAL_INVALIDA =
  'O banco não aceitou o usuário ou a senha da conexão. Gere uma conexão de leitura nova e cole aqui.'


export const ERRO_SEM_PERMISSAO =
  'A conexão funciona, mas esse usuário não tem permissão de leitura em alguma tabela que eu preciso ler. Peça ao responsável pelo seu banco para liberar a leitura, e veja o passo a passo no guia de instalação.'


export const ERRO_CONEXAO_MALFORMADA =
  'A conexão não está no formato que eu entendo. Ela começa com postgres:// e leva usuário, senha, endereço, porta e o nome do banco. Copie de novo do painel do seu banco.'

export const ERRO_DEMOROU_DEMAIS =
  'O banco demorou demais para responder e eu parei de esperar. Se ele estiver lento agora, tente mais tarde.'

export const ERRO_BANCO_GENERICO =
  'O banco não respondeu como eu esperava. Confira a conexão no painel do seu banco e tente outra vez.'


export const RECUSA_CONEXAO_COM_PODER_DEMAIS =
  'Essa conexão tem poder de administrador no seu banco, e eu não aceito uma assim. Com ela, uma consulta que saísse errada poderia ler arquivos do servidor ou derrubar o banco do seu negócio, e a proteção que eu tenho não alcança esse caso. Peça ao responsável pelo seu banco um acesso que só consegue ler as tabelas, e cole aqui a conexão dele. O passo a passo está no guia de instalação.'


export const AVISO_PODER_DA_CONEXAO_NAO_CONFERIDO =
  'Não consegui confirmar se essa conexão é só de leitura, porque o seu banco não respondeu essa checagem. Eu não estou impedindo você de seguir, mas confira com o responsável pelo seu banco que o acesso colado aqui só consegue ler as tabelas, e não alterar nem apagar nada. O passo a passo está no guia de instalação.'


export const ERRO_CERTIFICADO_NAO_CONFERE =
  'Eu me conecto de forma criptografada e confiro o certificado de segurança do seu banco. O certificado que ele apresentou não confere, e por isso eu parei antes de mandar a sua senha. Se o seu banco usa um certificado próprio, acrescente ?sslmode=no-verify ao final da conexão para eu continuar criptografando sem conferir o certificado. Se a conexão já tiver um ? em algum lugar, use &sslmode=no-verify.'


export const RECUSA_RESULTADO_GRANDE_DEMAIS =
  'Essa consulta trouxe um resultado grande demais para eu carregar de uma vez, e eu parei antes de tentar. Isso costuma acontecer quando ela traz textos longos, como observações e comentários. Ajuste a pergunta para trazer contagens e totais, e ela volta a rodar sozinha no horário marcado.'


export const RECUSA_NAO_E_LEITURA =
  'Recusada porque não é uma leitura simples. A fonte só aceita consulta que lê e agrupa, nunca que altera dado.'


export const RECUSA_SQL_COM_DOLAR =
  'Recusada porque a consulta abre um trecho de texto com cifrão, e eu não aceito essa forma de escrever. Deixe o texto entre aspas simples, como \'whatsapp\'.'


export const RECUSA_FUNCAO_NAO_PERMITIDA =
  'Recusada porque ela usa uma função que eu não aceito. Aqui entram só contas simples sobre os seus dados, como contar, somar, tirar média, pegar o menor e o maior, arredondar, cortar texto e agrupar por data. Reescreva a pergunta usando só essas contas.'


export const RECUSA_LE_O_PROPRIO_BANCO =
  'Recusada porque ela lê os bastidores do banco, como a lista de tabelas e as configurações do servidor, em vez dos dados do seu negócio. Aponte a pergunta para as suas tabelas, como vendas, pedidos ou atendimentos.'

export const RECUSA_DADO_PESSOAL =
  'Recusada porque traria dado que identifica uma pessoa. O que sai daqui vira nota guardada no seu repositório, então nome, e-mail, telefone e endereço nunca passam.'

export const RECUSA_NAO_AGREGA =
  'Recusada porque ela traria os registros como estão, em vez de contagens e totais. Eu só guardo no seu Cérebro número somado e agrupado, nunca a lista de linhas do seu banco.'


export const RECUSA_SERIALIZA_LINHA =
  'Recusada porque ela empacotaria os registros inteiros dentro de uma coluna só, junto com as contagens. Eu guardo no seu Cérebro número somado e agrupado, então tire do resultado a parte que junta as linhas e deixe só as contagens e os totais.'


export const RECUSA_DESTINO_FORA_DO_CONHECIMENTO =
  'Recusada porque o destino não é uma pasta de conhecimento. Guarde a resposta numa pasta sua, como clientes/quem-e.md, e não solta na raiz nem dentro de pastas reservadas do sistema.'

export const RECUSA_CAMINHO_DA_NOTA =
  'Recusada porque o destino da nota não é um caminho válido. Use algo como clientes/quem-e.md.'


export const RECUSA_AGREGADO_TEXTO_LIVRE =
  'Recusada porque um dos valores do resultado é um texto longo, não uma categoria curta como "canal" ou "São Paulo". Isso costuma significar que a consulta trouxe um comentário ou uma observação escrita, em vez de um número agrupado. Ajuste a consulta para contar ou somar, não para trazer o texto inteiro.'


export const RECUSA_AGREGADO_SERIALIZADO =
  'Recusada porque um dos valores do resultado veio com várias colunas empacotadas dentro de uma única célula, em vez de separadas. Ajuste a consulta para devolver contagens e totais em colunas próprias.'


export const AVISO_ORCAMENTO_PAUSOU_FONTE =
  'Parei de atualizar esta fonte porque o gasto do mês atingiu o teto de orçamento definido no painel. Aumente o teto ou espere virar o mês, e eu volto sozinho.'


export const AVISO_NENHUMA_PROPOSTA =
  'Nenhuma pergunta sobreviveu às regras de segurança desta vez. Veja abaixo o motivo de cada uma que eu descartei.'


export const ERRO_CREDENCIAL_AUSENTE =
  'Não encontrei a conexão salva desta fonte. Abra a tela de Fontes e cole a conexão de novo.'


export const ERRO_NOTA_PATH_NAO_CONFIGURADO =
  'Esta consulta ainda não tem um destino de nota definido, e eu não sei guardar sem um. Edite a consulta na tela de Fontes e escolha onde salvar.'


export const AVISO_DADO_PESSOAL_DESATIVOU_CONSULTA =
  'Desativei esta consulta porque ela está trazendo dado que identifica uma pessoa, e isso não pode continuar sendo enviado para fora do seu banco. Ajuste a consulta para não trazer nome, e-mail, telefone, endereço ou documento, e reative na tela de Fontes quando corrigir.'


export const ERRO_DESTILACAO_FALHOU =
  'Eu li os dados desta fonte, mas não consegui escrever a leitura deles em texto desta vez. Isso costuma ser passageiro. A próxima rodada tenta sozinha.'


export const ERRO_PROPOSTA_FALHOU =
  'Eu li a estrutura do seu banco, mas não consegui montar as perguntas desta vez. Isso costuma ser passageiro. Tente daqui a pouco.'


export const ERRO_CHAVE_OPENAI_AUSENTE =
  'A chave da OpenAI ainda não está salva, e sem ela eu não consigo montar as perguntas nem escrever as notas. Abra as Configurações e cole a chave.'


export const ERRO_ESCRITA_NO_CEREBRO =
  'Eu li os dados desta fonte e preparei a nota, mas guardar ela no seu Cérebro não terminou como eu esperava. Confira nas Configurações se o repositório do Cérebro está conectado. A próxima rodada tenta sozinha.'


export const ERRO_CEREBRO_NAO_CONFIGURADO =
  'Eu li os dados desta fonte, mas ainda não tenho onde guardar a nota. Abra as Configurações e conecte o repositório do Cérebro.'


export const AVISO_NOTA_ESPERA_APROVACAO =
  'A atualização desta nota está esperando a sua aprovação. Enquanto ela não for aprovada, eu não escrevo por cima. Abra a tela de Aprovações para liberar.'


export const AVISO_CONSULTA_CORTADA =
  'Esta consulta trouxe mais linhas do que eu guardo de uma vez, e usei só uma parte do resultado. Se puder, ajuste a consulta para agrupar por um grupo mais específico.'


export const AVISO_NOTA_MANTIDA_PELA_FONTE =
  'Se você escrever nesta nota na mão, eu paro de atualizar ela sozinho e aviso no painel de Fontes.'


export const RECUSA_NOTA_EDITADA_A_MAO =
  'Não atualizei esta nota porque o texto dela mudou depois que eu escrevi, e eu não escrevo por cima do que é seu. Se quiser que eu volte a cuidar dela sozinho, apague o que você escreveu ali, ou aponte esta pergunta para outra nota na tela de Fontes.'


export function carimboDaFonte(data: string): string {
  return `Atualizado automaticamente em ${data} a partir da fonte conectada. ${AVISO_NOTA_MANTIDA_PELA_FONTE}`
}


export const ERRO_NOTA_PATH_EM_USO =
  'Essa nota já é o destino de outra pergunta salva. Escolha um destino diferente para esta pergunta.'


export function mensagemDeErroDaFonte(bruto: string): string {
  const t = (bruto ?? '').toLowerCase()
  
  
  
  
  
  if (t.includes('permission denied') || t.includes('must be owner')) return ERRO_SEM_PERMISSAO
  
  
  
  
  
  
  if (t.includes('certificate') || t.includes('cert_') || t.includes('_cert')) return ERRO_CERTIFICADO_NAO_CONFERE
  if (t.includes('timeout') || t.includes('etimedout') || t.includes('canceling statement')) return ERRO_DEMOROU_DEMAIS
  if (t.includes('enotfound') || t.includes('eai_again')) return ERRO_ENDERECO_NAO_ENCONTRADO
  if (t.includes('econnrefused') || t.includes('econnreset') || t.includes('ehostunreach')) return ERRO_CONEXAO_RECUSADA
  if (t.includes('authentication failed') || t.includes('no pg_hba') || (t.includes('role') && t.includes('does not exist'))) {
    return ERRO_CREDENCIAL_INVALIDA
  }
  return ERRO_BANCO_GENERICO
}


export const TODAS_AS_MENSAGENS: readonly string[] = [
  ERRO_CONEXAO_RECUSADA, ERRO_ENDERECO_NAO_ENCONTRADO, ERRO_CREDENCIAL_INVALIDA,
  ERRO_DEMOROU_DEMAIS, ERRO_BANCO_GENERICO, ERRO_SEM_PERMISSAO, ERRO_CONEXAO_MALFORMADA,
  RECUSA_CONEXAO_COM_PODER_DEMAIS, AVISO_PODER_DA_CONEXAO_NAO_CONFERIDO,
  ERRO_CERTIFICADO_NAO_CONFERE, RECUSA_RESULTADO_GRANDE_DEMAIS,
  RECUSA_NAO_E_LEITURA, RECUSA_DADO_PESSOAL, RECUSA_NAO_AGREGA, RECUSA_SERIALIZA_LINHA, RECUSA_CAMINHO_DA_NOTA,
  RECUSA_DESTINO_FORA_DO_CONHECIMENTO,
  RECUSA_SQL_COM_DOLAR, RECUSA_FUNCAO_NAO_PERMITIDA, RECUSA_LE_O_PROPRIO_BANCO,
  RECUSA_AGREGADO_TEXTO_LIVRE, RECUSA_AGREGADO_SERIALIZADO,
  AVISO_ORCAMENTO_PAUSOU_FONTE,
  AVISO_NENHUMA_PROPOSTA,
  ERRO_CREDENCIAL_AUSENTE, ERRO_NOTA_PATH_NAO_CONFIGURADO, AVISO_DADO_PESSOAL_DESATIVOU_CONSULTA,
  AVISO_CONSULTA_CORTADA, ERRO_NOTA_PATH_EM_USO,
  ERRO_DESTILACAO_FALHOU, ERRO_ESCRITA_NO_CEREBRO, ERRO_CEREBRO_NAO_CONFIGURADO,
  ERRO_PROPOSTA_FALHOU, ERRO_CHAVE_OPENAI_AUSENTE,
  AVISO_NOTA_ESPERA_APROVACAO,
  AVISO_NOTA_MANTIDA_PELA_FONTE, RECUSA_NOTA_EDITADA_A_MAO,
  
  
  carimboDaFonte('2026-08-25'),
]
