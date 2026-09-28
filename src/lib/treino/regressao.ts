
export interface ResultadoTeste { casoId: string; passou: boolean; estavel: boolean }
export interface ResumoRegressao { total: number; passando: number; quebrados: string[]; instaveis: string[] }

export function resumoRegressao(resultados: ResultadoTeste[]): ResumoRegressao {
  const instaveis = resultados.filter((x) => !x.estavel).map((x) => x.casoId)
  const estaveis = resultados.filter((x) => x.estavel)
  return {
    total: resultados.length,
    passando: estaveis.filter((x) => x.passou).length,
    quebrados: estaveis.filter((x) => !x.passou).map((x) => x.casoId),
    instaveis,
  }
}
