


export const CLOSER_DONE = 'Me diz se quer que eu detalhe ou ajuste algo.'
export const CLOSER_FAILED = 'Quer que eu tente de novo ou ajuste algo?'


export const MAX_CORPO_BASE = 3500

export interface RetornoConselheiroInput {
  
  agenteNome: string
  
  objetivo: string
  
  resultado: string
  status: 'done' | 'failed'
}

export function montarRetornoConselheiro(
  input: RetornoConselheiroInput,
): { titulo: string; corpo: string } {
  const nome = input.agenteNome.trim() || 'time'

  
  const capCorpoBase = (raw: string): string => {
    if (raw.length > MAX_CORPO_BASE) {
      return raw.slice(0, MAX_CORPO_BASE).trimEnd() + '…'
    }
    return raw
  }

  if (input.status === 'done') {
    const titulo = `Terminei o que você pediu pro ${nome}`
    const corpoBase = capCorpoBase(input.resultado.trim() || 'Concluída.')
    const corpo = `${corpoBase}\n\n${CLOSER_DONE}`
    return { titulo, corpo }
  }

  
  const obj = input.objetivo.trim()
  const titulo = obj
    ? `O ${nome} travou em "${obj}"`
    : `O ${nome} travou na tarefa`

  const corpoBase = capCorpoBase(input.resultado.trim() || 'Sem detalhes.')
  const corpo = `${corpoBase}\n\n${CLOSER_FAILED}`
  return { titulo, corpo }
}
