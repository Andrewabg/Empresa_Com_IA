


















import { MAX_FONTES, MAX_CONSULTAS_POR_FONTE } from '@/lib/fontes/tipos'


export const ERRO_LISTAR_FONTES = 'Não consegui carregar suas fontes agora.'
export const ERRO_GRAVAR_SEGREDO = 'Não consegui guardar a conexão com segurança.'
export const ERRO_SALVAR_FONTE = 'Não consegui salvar a fonte agora.'


export const ERRO_LIMITE_DE_FONTES =
  `Você já conectou ${MAX_FONTES} fontes, que é o máximo que eu mantenho de uma vez. Remova uma que não usa mais para conectar outra.`


export const MENSAGENS_DA_ROTA_FONTES: readonly string[] = [
  ERRO_LISTAR_FONTES,
  ERRO_GRAVAR_SEGREDO,
  ERRO_SALVAR_FONTE,
  ERRO_LIMITE_DE_FONTES,
]


export const FONTE_NADA_PARA_MUDAR = 'Nada para mudar.'
export const ERRO_ALTERNAR_FONTE = 'Não consegui mudar a fonte agora.'
export const ERRO_REMOVER_FONTE = 'Não consegui remover a fonte agora.'
export const ERRO_FONTE_NAO_ENCONTRADA_ALTERNAR = 'Fonte não encontrada.'


export const ERRO_ORIGEM_NAO_PERMITIDA =
  'Este pedido não veio da tela do seu painel, então eu não removi nada. Abra a tela de Fontes e remova por lá.'


export const MENSAGENS_DA_ROTA_FONTE_ID: readonly string[] = [
  FONTE_NADA_PARA_MUDAR,
  ERRO_ALTERNAR_FONTE,
  ERRO_REMOVER_FONTE,
  ERRO_FONTE_NAO_ENCONTRADA_ALTERNAR,
  ERRO_ORIGEM_NAO_PERMITIDA,
]


export const ERRO_FONTE_NAO_ENCONTRADA_RECONHECER = 'Fonte não encontrada.'
export const ERRO_CONEXAO_NAO_GUARDADA = 'A conexão desta fonte não está mais guardada. Conecte outra vez.'



export const MENSAGENS_DA_ROTA_RECONHECER: readonly string[] = [
  ERRO_FONTE_NAO_ENCONTRADA_RECONHECER,
  ERRO_CONEXAO_NAO_GUARDADA,
]


export const ERRO_FONTE_NAO_ENCONTRADA_CONSULTA = 'Fonte não encontrada.'
export const ERRO_SALVAR_CONSULTA = 'Não consegui salvar esta pergunta agora.'


export const ERRO_LIMITE_DE_CONSULTAS =
  `Esta fonte já tem ${MAX_CONSULTAS_POR_FONTE} perguntas, que é o máximo que eu mantenho por fonte. Remova uma pergunta que não usa mais para criar outra.`

export const MENSAGENS_DA_ROTA_CONSULTAS: readonly string[] = [
  ERRO_FONTE_NAO_ENCONTRADA_CONSULTA,
  ERRO_SALVAR_CONSULTA,
  ERRO_LIMITE_DE_CONSULTAS,
]


export const CONSULTA_NADA_PARA_MUDAR = 'Nada para mudar.'
export const ERRO_CONSULTA_NAO_ENCONTRADA = 'Pergunta não encontrada.'
export const ERRO_MUDAR_CONSULTA = 'Não consegui mudar esta pergunta agora.'
export const ERRO_REMOVER_CONSULTA = 'Não consegui remover esta pergunta agora.'

export const MENSAGENS_DA_ROTA_CONSULTA_ID: readonly string[] = [
  CONSULTA_NADA_PARA_MUDAR,
  ERRO_CONSULTA_NAO_ENCONTRADA,
  ERRO_MUDAR_CONSULTA,
  ERRO_REMOVER_CONSULTA,
]


export const ERRO_CONSULTA_NAO_ENCONTRADA_TESTAR = 'Pergunta não encontrada.'
export const ERRO_FONTE_NAO_ENCONTRADA_TESTAR = 'Fonte não encontrada.'
export const ERRO_CONEXAO_NAO_GUARDADA_TESTAR =
  'A conexão desta fonte não está mais guardada. Conecte outra vez.'


export const ERRO_FONTE_DESLIGADA_TESTAR =
  'Esta fonte está desligada, então eu não abro conexão com o banco dela. Ligue a fonte na tela de Fontes para testar a pergunta.'

export const MENSAGENS_DA_ROTA_TESTAR: readonly string[] = [
  ERRO_CONSULTA_NAO_ENCONTRADA_TESTAR,
  ERRO_FONTE_NAO_ENCONTRADA_TESTAR,
  ERRO_CONEXAO_NAO_GUARDADA_TESTAR,
  ERRO_FONTE_DESLIGADA_TESTAR,
]
