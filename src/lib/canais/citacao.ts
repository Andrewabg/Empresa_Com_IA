





export const CAP_CITACAO = 120

export interface MensagemCitada { autor: 'contato' | 'agente' | 'operador'; texto: string }

const QUEM: Record<MensagemCitada['autor'], string> = {
  contato: 'a própria mensagem dele',
  agente: 'sua mensagem',
  operador: 'a mensagem do colega do time',
}

export function prefixarCitacao(texto: string, citado: MensagemCitada | null): string {
  if (!citado) return texto
  
  const limpo = citado.texto.replace(/\s+/g, ' ').trim()
  if (!limpo) return texto
  const trecho = limpo.length > CAP_CITACAO ? `${limpo.slice(0, CAP_CITACAO)}…` : limpo
  return `[respondendo a ${QUEM[citado.autor]}: "${trecho}"] ${texto}`
}
