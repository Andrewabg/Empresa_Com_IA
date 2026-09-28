







export interface AvaliacaoProva {
  
  indice: number
  
  nota: number
  
  textoLegivel: boolean
  
  caraDeIa: boolean
  
  textoCortado: boolean
  problemas: string[]
  
  cenaConfere?: boolean
  
  evidencia?: string
}


export interface DecisaoDeProvas {
  
  escolhida: number
  
  reroll: number[]
}


const PENALIDADE_IA = 2


const PENALIDADE_CENA = 1.5


function reprovada(a: AvaliacaoProva): boolean {
  return !a.textoLegivel || a.textoCortado
}


export function escolherMelhorProva(
  avaliacoes: AvaliacaoProva[], fallback: number, total?: number,
): DecisaoDeProvas {
  const validas = avaliacoes.filter(
    (a) => Number.isInteger(a.indice) && a.indice >= 0 && (total === undefined || a.indice < total),
  )
  const aprovadas = validas.filter((a) => !reprovada(a))
  
  
  const reroll = validas
    .filter((a) => reprovada(a) || a.cenaConfere === false)
    .map((a) => a.indice).sort((x, y) => x - y)
  if (!aprovadas.length) return { escolhida: fallback, reroll }

  let melhor = aprovadas[0]!
  let melhorScore = -Infinity
  for (const a of aprovadas) {
    const score = a.nota - (a.caraDeIa ? PENALIDADE_IA : 0) - (a.cenaConfere === false ? PENALIDADE_CENA : 0)
    
    if (score > melhorScore) { melhorScore = score; melhor = a }
  }
  return { escolhida: melhor.indice, reroll }
}


export function resumirCriticaVisual(
  avaliacoes: AvaliacaoProva[],
): { aprovado: boolean; problemas: string[] } {
  const problemas: string[] = []
  for (const a of avaliacoes) {
    const rot = `Prova ${a.indice + 1}`
    
    const comProva = (t: string) => (a.evidencia?.trim() ? `${t} (${a.evidencia.trim()})` : t)
    if (!a.textoLegivel) problemas.push(`${rot}: ${comProva('texto renderizado ilegível')}`)
    if (a.textoCortado) problemas.push(`${rot}: ${comProva('texto fora da zona segura')}`)
    if (a.caraDeIa) problemas.push(`${rot}: ${comProva('a imagem tem cara de gerada por IA')}`)
    if (a.cenaConfere === false) problemas.push(`${rot}: ${comProva('a cena não é a que foi pedida')}`)
    for (const p of a.problemas) {
      const t = p.trim()
      if (t) problemas.push(`${rot}: ${t}`)
    }
  }
  return { aprovado: problemas.length === 0, problemas }
}
