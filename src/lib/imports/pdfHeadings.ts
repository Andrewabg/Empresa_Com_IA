



export interface ItemPdf {
  str: string
  
  y: number
  
  height: number
}


export interface LinhaPdf {
  str: string
  height: number
}






export function agruparLinhasPorY(itens: ItemPdf[], tol: number): LinhaPdf[] {
  if (itens.length === 0) return []

  
  const grupos: Array<{ y: number; str: string; height: number }> = []

  for (const item of itens) {
    
    const grupo = grupos.find(g => Math.abs(g.y - item.y) <= tol)
    if (grupo) {
      grupo.str += item.str
      grupo.height = Math.max(grupo.height, item.height)
    } else {
      grupos.push({ y: item.y, str: item.str, height: item.height })
    }
  }

  
  grupos.sort((a, b) => b.y - a.y)

  return grupos.map(g => ({ str: g.str, height: g.height }))
}






function mediana(valores: number[]): number {
  if (valores.length === 0) return 0
  const sorted = [...valores].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2
}


export function montarMarkdownComHeadings(linhas: LinhaPdf[]): string {
  
  const validas = linhas.filter(l => l.str.trim() !== '')
  if (validas.length === 0) return ''

  
  const base = mediana(validas.map(l => l.height))

  
  const limiar = base * 1.15
  const alturasDistintas = [...new Set(validas.map(l => l.height))]
    .filter(h => h > limiar)
    .sort((a, b) => b - a) 
    .slice(0, 3) 

  
  const nivelPorAltura = new Map<number, number>()
  alturasDistintas.forEach((h, idx) => nivelPorAltura.set(h, idx + 1))

  
  const partes: string[] = []
  for (const linha of validas) {
    const nivel = nivelPorAltura.get(linha.height)
    if (nivel !== undefined) {
      partes.push(`${'#'.repeat(nivel)} ${linha.str}`)
    } else {
      partes.push(linha.str)
    }
  }

  return partes.join('\n\n')
}
