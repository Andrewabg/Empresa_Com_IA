
export interface TetoAplicado<T> {
  
  tools: Record<string, T>
  
  cortadas: string[]
}

export function aplicarTetoDeAcoes<T>(tools: Record<string, T>, teto: number): TetoAplicado<T> {
  
  
  const limite = Number.isFinite(teto) ? Math.max(0, Math.trunc(teto)) : 0
  const nomes = Object.keys(tools)
  if (nomes.length <= limite) return { tools, cortadas: [] }
  const mantidos = nomes.slice(0, limite)
  const dentro: Record<string, T> = {}
  for (const n of mantidos) dentro[n] = tools[n]
  return { tools: dentro, cortadas: nomes.slice(limite) }
}
