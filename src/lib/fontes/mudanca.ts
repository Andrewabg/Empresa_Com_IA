











import type { Agregado, Registro } from './tipos'


export const LIMIAR_PCT_DEFAULT = 5


function chaveDaLinha(linha: Registro, colunas: string[]): string {
  return String(linha[colunas[0]] ?? '')
}

function indexar(a: Agregado): Map<string, Registro> {
  const m = new Map<string, Registro>()
  for (const linha of a.linhas) m.set(chaveDaLinha(linha, a.colunas), linha)
  return m
}


export function mudouMaterialmente(
  anterior: Agregado | null,
  novo: Agregado,
  limiarPct: number = LIMIAR_PCT_DEFAULT,
): boolean {
  if (!anterior) return true                                   

  const antes = indexar(anterior)
  const depois = indexar(novo)
  if (antes.size !== depois.size) return true                  

  for (const [chave, linhaDepois] of depois) {
    const linhaAntes = antes.get(chave)
    if (!linhaAntes) return true                               

    for (const coluna of novo.colunas) {
      const a = linhaAntes[coluna]
      const b = linhaDepois[coluna]
      if (a === b) continue

      if (typeof a === 'number' && typeof b === 'number') {
        
        if (a === 0 || b === 0) return true
        const variacao = Math.abs((b - a) / a) * 100
        if (variacao > limiarPct) return true
        continue
      }
      return true                                              
    }
  }
  return false
}
