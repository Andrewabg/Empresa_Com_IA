







const MAX_CONSULTA = 600


export function consultaCerebroDaPeca(brief: Record<string, unknown>, formatoNome: string): string {
  const partes: string[] = []
  for (const v of Object.values(brief)) {
    if (typeof v === 'string') {
      const t = v.trim()
      if (t) partes.push(t)
    } else if (typeof v === 'number' && Number.isFinite(v)) {
      partes.push(String(v))
    }
    
  }
  partes.push(formatoNome)
  return partes.join(' ').slice(0, MAX_CONSULTA)
}
