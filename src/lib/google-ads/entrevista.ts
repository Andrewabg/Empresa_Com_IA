



import type { Ficha } from '@/lib/google-ads/ficha'






interface Topic {
  id: string
  label: string
  tag: string
  mandatory: boolean
  seedQuestion: string
}


interface FichaTopic extends Topic {
  
  campo: keyof Ficha
}






export const FICHA_TOPICS: FichaTopic[] = [
  
  {
    id: 'ticket-medio',
    label: 'Ticket médio',
    tag: 'ficha:ticket-medio',
    mandatory: true,
    campo: 'ticket',
    seedQuestion:
      'Qual é o ticket médio do seu produto ou serviço — quanto o cliente paga em média numa compra? (Ex.: "R$ 500 por consulta" ou "R$ 1.200 por contrato")',
  },
  {
    id: 'margem-bruta',
    label: 'Margem bruta',
    tag: 'ficha:margem-bruta',
    mandatory: true,
    campo: 'margem',
    seedQuestion:
      'Qual é a sua margem bruta — de tudo que entra, quanto sobra depois de pagar o custo direto do produto/serviço? (Ex.: "40%" ou "depois de pagar fornecedor fica 30%")',
  },
  
  {
    id: 'o-que-faz',
    label: 'O que a empresa faz',
    tag: 'ficha:o-que-faz',
    mandatory: true,
    campo: 'oQueFaz',
    seedQuestion:
      'Em uma frase curta, o que a sua empresa faz? (Ex.: "Clínica de estética focada em harmonização facial" ou "Advocacia trabalhista para empresas")',
  },
  {
    id: 'vertical-segmento',
    label: 'Segmento / vertical',
    tag: 'ficha:vertical-segmento',
    mandatory: true,
    campo: 'vertical',
    seedQuestion:
      'Qual é o segmento do seu negócio? (Ex.: saúde, advocacia, e-commerce, imóveis, serviços financeiros…) Isso ajuda a configurar as políticas do Google Ads corretamente.',
  },
  
  {
    id: 'geografia',
    label: 'Regiões de atuação',
    tag: 'ficha:geografia',
    mandatory: true,
    campo: 'geografia',
    seedQuestion:
      'Em quais cidades ou regiões você atende? (Ex.: "Só São Paulo capital", "Toda a Grande SP" ou "Brasil inteiro, online")',
  },
  {
    id: 'capacidade-atendimento',
    label: 'Capacidade de atendimento',
    tag: 'ficha:capacidade-atendimento',
    mandatory: true,
    campo: 'capacidade',
    seedQuestion:
      'Quantos clientes novos você consegue atender por mês sem comprometer a qualidade? (Ex.: "10 consultas" ou "30 pedidos")',
  },
  
  {
    id: 'objetivo-campanha',
    label: 'Objetivo da campanha',
    tag: 'ficha:objetivo-campanha',
    mandatory: true,
    campo: 'objetivo',
    seedQuestion:
      'Qual é o principal objetivo da campanha de Google Ads agora? (Ex.: "Gerar consultas", "Vender o curso X", "Capturar leads qualificados para minha equipe de vendas")',
  },
  {
    id: 'sazonalidade',
    label: 'Sazonalidade do negócio',
    tag: 'ficha:sazonalidade',
    mandatory: false,
    campo: 'sazonalidade',
    seedQuestion:
      'O seu negócio tem picos ou vales ao longo do ano? (Ex.: "Janeiro é fraco, dezembro é forte" ou "Não tem sazonalidade relevante")',
  },
]





export interface CoberturaFicha {
  
  preenchidos: FichaTopic[]
  
  faltando: FichaTopic[]
  
  obrigatoriosFaltando: FichaTopic[]
  
  minimoOk: boolean
}


function campoPreenchido(ficha: Ficha, campo: keyof Ficha): boolean {
  const val = ficha[campo]
  if (val === undefined || val === null) return false
  if (typeof val === 'string' && val.trim() === '') return false
  return true
}


export function coberturaFicha(ficha: Ficha): CoberturaFicha {
  const preenchidos: FichaTopic[] = []
  const faltando: FichaTopic[] = []

  for (const topic of FICHA_TOPICS) {
    if (campoPreenchido(ficha, topic.campo)) {
      preenchidos.push(topic)
    } else {
      faltando.push(topic)
    }
  }

  const obrigatoriosFaltando = faltando.filter((t) => t.mandatory)

  return {
    preenchidos,
    faltando,
    obrigatoriosFaltando,
    minimoOk: obrigatoriosFaltando.length === 0,
  }
}






export type Estimativas = Partial<Record<keyof Ficha, number>>


export function proximaPergunta(ficha: Ficha, estimativas?: Estimativas): string | null {
  const { obrigatoriosFaltando, minimoOk } = coberturaFicha(ficha)

  if (minimoOk) return null

  
  const proximo = obrigatoriosFaltando[0]
  if (!proximo) return null

  
  const estimativa = estimativas?.[proximo.campo]
  if (estimativa !== undefined && estimativa !== null) {
    return montarPerguntaComEstimativa(proximo, estimativa)
  }

  
  return proximo.seedQuestion
}


function montarPerguntaComEstimativa(topic: FichaTopic, estimativa: number): string {
  
  let valorFormatado: string
  if (topic.campo === 'margem') {
    
    valorFormatado = `${Math.round(estimativa * 100)}%`
  } else if (estimativa < 1 && estimativa > 0) {
    
    valorFormatado = `${Math.round(estimativa * 100)}%`
  } else {
    
    valorFormatado = `R$ ${estimativa.toLocaleString('pt-BR')}`
  }

  return `Baseado no seu segmento, estimei ${topic.label.toLowerCase()} em ~${valorFormatado}. Isso está próximo da realidade ou você tem um número diferente?`
}






function reaisBr(n: number): string {
  return `R$ ${Math.round(n).toLocaleString('pt-BR')}`
}


export function gaelEntrevistaDirective(ficha: Ficha): string {
  const cob = coberturaFicha(ficha)

  if (!cob.minimoOk) {
    const faltam = cob.obrigatoriosFaltando.map((t) => t.label).join(', ')
    const prox = proximaPergunta(ficha) ?? cob.obrigatoriosFaltando[0]?.seedQuestion ?? ''
    return [
      'ENTREVISTA DO NEGÓCIO (Ficha do Google Ads) — em andamento.',
      `Antes de analisar a conta ou propor campanha, você precisa entender o negócio. Ainda falta: ${faltam}.`,
      'PRÓXIMA PERGUNTA — faça SÓ esta, com calor e sem jargão:',
      prox,
      'Assim que o dono responder, CHAME a tool `entrevistaFicha` com o que ele disse (um ou mais campos): ela guarda a resposta e te devolve a próxima pergunta. Uma pergunta por vez. NÃO avance para análise ou campanha enquanto a Ficha não tiver o mínimo.',
    ].join('\n')
  }

  
  const linhas: string[] = ['FICHA DO NEGÓCIO (Google Ads) — completa. Use como âncora de toda recomendação.']
  if (ficha.cpaTetoRealista != null) {
    const be = ficha.cpaTetoBreakeven != null ? ` (break-even ${reaisBr(ficha.cpaTetoBreakeven)})` : ''
    linhas.push(`CPA-teto realista: ${reaisBr(ficha.cpaTetoRealista)}${be}. Nunca aceite um CPA acima do teto sem avisar o dono.`)
  }
  if (ficha.vertical) linhas.push(`Segmento: ${ficha.vertical}.`)
  if (ficha.objetivo) linhas.push(`Objetivo: ${ficha.objetivo}.`)
  linhas.push('Agora OFEREÇA um raio-X da conta: chame `analisarConta` para mostrar ao dono a nota de saúde 0-100, o dinheiro que está sendo queimado e o ritmo de gasto.')
  linhas.push('Se algo do negócio mudar, chame `entrevistaFicha` para atualizar a Ficha.')
  return linhas.join('\n')
}
