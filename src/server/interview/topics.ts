export interface Topic { id: string; label: string; tag: string; mandatory: boolean; seedQuestion: string }
export function topicTag(id: string): string { return `tópico:${id}` }
export const TOPICS: Topic[] = [
  { id: 'o-que-faz', label: 'O que a empresa faz', tag: topicTag('o-que-faz'), mandatory: true, seedQuestion: 'Em uma frase, o que a sua empresa faz?' },
  { id: 'publico', label: 'Público / clientes', tag: topicTag('publico'), mandatory: true, seedQuestion: 'Pra quem ela serve — quem é o cliente ideal?' },
  { id: 'oferta', label: 'Oferta / produtos', tag: topicTag('oferta'), mandatory: true, seedQuestion: 'Quais são os produtos ou serviços que vocês oferecem?' },
  { id: 'receita', label: 'Como ganha dinheiro', tag: topicTag('receita'), mandatory: false, seedQuestion: 'Como a empresa ganha dinheiro — preços, planos, ticket médio?' },
  { id: 'metas', label: 'Metas atuais', tag: topicTag('metas'), mandatory: false, seedQuestion: 'Qual é o foco principal agora, neste trimestre?' },
  { id: 'processos', label: 'Processos-chave', tag: topicTag('processos'), mandatory: false, seedQuestion: 'Como o trabalho flui — da venda à entrega?' },
  { id: 'pessoas', label: 'Pessoas / papéis', tag: topicTag('pessoas'), mandatory: false, seedQuestion: 'Quem faz o quê na empresa hoje?' },
  { id: 'ferramentas', label: 'Ferramentas / canais', tag: topicTag('ferramentas'), mandatory: false, seedQuestion: 'Onde a empresa opera — quais ferramentas e canais?' },
  { id: 'posicionamento', label: 'Posicionamento / concorrência', tag: topicTag('posicionamento'), mandatory: false, seedQuestion: 'O que te diferencia da concorrência?' },
  { id: 'restricoes', label: 'Restrições / regras', tag: topicTag('restricoes'), mandatory: false, seedQuestion: 'Tem algo que a empresa nunca deve fazer — limites, regras?' },
]

export const MANDATORY: Topic[] = TOPICS.filter((t) => t.mandatory)
