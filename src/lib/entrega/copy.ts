




import { fmtUsd } from '@/lib/chart'

export const COPY_SALA = {
  titulo: 'Entregas',
  subtitulo: 'Peça uma vez e acompanhe o pacote inteiro, item por item.',
  vazioTitulo: 'Nenhuma entrega ainda',
  vazioSub: 'Uma entrega é um pedido inteiro de uma vez: os anúncios, os posts e os roteiros do mês. A sua equipe divide o trabalho e você acompanha aqui.',
  botaoPedir: 'Pedir uma entrega',
  botaoPrimeira: 'Pedir a primeira',
  semMarca: 'Antes da primeira entrega eu preciso conhecer a sua marca. Faça a entrevista de marca no estúdio de copy e volte aqui.',
  semCopywriter: 'Você ainda não tem um copywriter na equipe. Contrate um na Loja e a Sala de Entrega passa a funcionar.',
  semDesigner: 'Você ainda não tem um designer na equipe, então esta entrega sai só com os textos. Contrate um na Loja para pedir as artes junto.',
  baixarPacote: 'Baixar o pacote',
  baixarPacoteAjuda: 'Um arquivo por peça, com a arte e o texto juntos, pronto para postar.',
} as const

export const COPY_WIZARD = {
  passo1Titulo: 'O que você precisa',
  passo1Sub: 'Escreva como você falaria com um sócio. Quanto mais específico, melhor sai.',
  labelObjetivo: 'Qual o objetivo desta entrega?',
  dicaObjetivo: 'Ex.: lançar a turma de setembro do curso, vender o plano anual, encher a agenda da clínica.',
  labelOferta: 'O que está sendo oferecido?',
  dicaOferta: 'O produto, o preço, o que está incluso e o prazo, se houver.',
  labelPublico: 'Para quem?',
  dicaPublico: 'Quem compra, o que essa pessoa já tentou antes e o que ela teme.',

  passo2Titulo: 'Quantas peças',
  passo2Sub: 'Escolha o que você quer receber. Dá para misturar anúncio, post e roteiro no mesmo pedido.',
  labelComArte: 'Fazer as artes junto',
  dicaComArte: 'O designer ilustra as peças que levam imagem. Os roteiros de vídeo saem só em texto, porque são para alguém gravar.',
  nenhumFormato: 'Escolha pelo menos uma peça para seguir.',

  passo3Titulo: 'Conferir e confirmar',
  passo3Sub: 'Este é o pedido. Ao confirmar, a equipe começa na hora.',
  tituloEstimativa: 'Estimativa de custo',
  rodapeEstimativa: 'É uma estimativa, não uma cobrança: o gasto real de cada chamada aparece medido no painel de custo, e sai da sua chave da OpenAI.',
  voltar: 'Voltar',
  avancar: 'Continuar',
  confirmar: 'Confirmar e começar',
  confirmando: 'Começando...',
  cancelar: 'Cancelar',
} as const


export function notaDeFinalizar(usdPorPeca: number): string {
  return `Finalizar uma arte em alta resolução custa cerca de US$ ${fmtUsd(usdPorPeca)} a mais, e só acontece nas que você escolher.`
}


export function avisoDoTeto(cortou: number, teto: number): string {
  return `Um pacote vai até ${teto} peças de cada vez. Deixei ${cortou} de fora; peça as que faltam numa segunda entrega.`
}
