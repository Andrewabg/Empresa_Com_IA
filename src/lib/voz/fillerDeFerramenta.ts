


export const FRASES_POR_TOOL: Readonly<Record<string, readonly string[]>> = {
  buscarMetricasTrafego: ['Deixa eu puxar os números da conta.', 'Vou conferir a conta agora.'],
  gerarRelatorio: ['Deixa eu puxar os números da conta.', 'Vou montar isso com os dados de agora.'],
  buscarCerebro: ['Deixa eu procurar no que a gente já anotou.', 'Vou consultar o que temos guardado.'],
  rascunharMemoria: ['Vou anotar isso.', 'Deixa eu guardar essa parte.'],
  consultarFuncionario: ['Vou falar com a equipe.', 'Deixa eu perguntar pra quem cuida disso.'],
  delegarTarefa: ['Vou passar isso pra equipe.', 'Deixa eu organizar isso com o time.'],
  gerarImagem: ['Vou criar a arte.', 'Deixa eu desenhar isso.'],
  gerarPeca: ['Vou escrever isso.', 'Deixa eu redigir.'],
  gerarCriativo: ['Vou escrever isso.', 'Deixa eu montar a peça.'],
  gerarContrato: ['Vou trabalhar no contrato.', 'Deixa eu redigir o contrato.'],
  analisarContrato: ['Vou ler o contrato.', 'Deixa eu analisar o documento.'],
}


export const FRASES_GENERICAS: readonly string[] = [
  'Deixa eu verificar isso.',
  'Vou olhar aqui.',
  'Deixa eu conferir.',
]

export interface EstadoDoFiller {
  
  readonly turnoQueFalou: string | null
}

export const FILLER_VAZIO: EstadoDoFiller = { turnoQueFalou: null }

export interface PassoDoFiller {
  estado: EstadoDoFiller
  
  frase: string | null
}


function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}


export function fillerDeFerramenta(
  estado: EstadoDoFiller,
  tool: string,
  turno: string,
): PassoDoFiller {
  if (estado.turnoQueFalou === turno) return { estado, frase: null }
  const catalogo = FRASES_POR_TOOL[tool] ?? FRASES_GENERICAS
  const frase = catalogo[fnv1a(`${turno}|${tool}`) % catalogo.length]
  return { estado: { turnoQueFalou: turno }, frase }
}
