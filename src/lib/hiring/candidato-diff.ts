


import type { CandidatoCardData, CandidatoAntes } from '@/server/agent/wireTypes'

export interface CandidatoDiff {
  
  missaoMudou: boolean
  
  orcamentoMudou: boolean
  
  ferramentasAdicionadas: CandidatoCardData['ferramentas']
  
  ferramentasRemovidas: CandidatoAntes['ferramentas']
}


export function candidatoDiff(candidato: CandidatoCardData): CandidatoDiff {
  const antes = candidato.antes
  const missaoMudou = !!antes && antes.missao !== candidato.missao
  const orcamentoMudou = !!antes && antes.budgetUsd !== candidato.budgetUsd
  
  
  const ferramentasAdicionadas = antes
    ? candidato.ferramentas.filter((f) => !antes.ferramentas.some((a) => a.slug.toUpperCase() === f.slug.toUpperCase()))
    : []
  const ferramentasRemovidas = antes
    ? antes.ferramentas.filter((a) => !candidato.ferramentas.some((f) => f.slug.toUpperCase() === a.slug.toUpperCase()))
    : []
  return { missaoMudou, orcamentoMudou, ferramentasAdicionadas, ferramentasRemovidas }
}
