







export const CONTRATO_CHAR_CAP = 60_000

const CHARS_POR_PAGINA = 2_000

const JANELA = 600


const SINAIS: RegExp[] = [
  /\d{1,2}\/\d{1,2}\/\d{2,4}/g,          
  /\d{4}-\d{2}-\d{2}/g,                   
  
  
  
  /\b(?:janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/gi,
  /\d{1,3}\s*\(?[^)\n]{0,20}\)?\s*(?:dias|meses|m[eê]s)\b/gi, 
  /vig[eê]ncia/gi,
  /rescis[aã]o/gi,
  /renova[cç][aã]o/gi,
  /aviso\s+pr[eé]vio/gi,
  /venc(?:imento|e)|pagamento|parcela/gi,
]


export interface CapResult { texto: string; truncado: boolean; nota: string }


export function caparTexto(texto: string, cap = CONTRATO_CHAR_CAP): CapResult {
  const t = texto ?? ''
  if (t.length <= cap) return { texto: t, truncado: false, nota: '' }
  const cortado = t.slice(0, cap)
  const paginas = Math.max(1, Math.round(cap / CHARS_POR_PAGINA))
  return {
    texto: cortado,
    truncado: true,
    nota: `documento muito longo — analisei as primeiras ~${paginas} paginas (${cap.toLocaleString('pt-BR')} caracteres) do teor.`,
  }
}


export function temSinalDePrazo(texto: string): boolean {
  const t = texto ?? ''
  return SINAIS.some((re) => { re.lastIndex = 0; return re.test(t) })
}


export function fatiarSecoesComData(texto: string, capTotal = CONTRATO_CHAR_CAP): string {
  const t = texto ?? ''
  if (!t) return ''
  
  const hits: Array<[number, number]> = []
  for (const re of SINAIS) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(t)) !== null) {
      hits.push([Math.max(0, m.index - JANELA), Math.min(t.length, m.index + m[0].length + JANELA)])
      if (m.index === re.lastIndex) re.lastIndex++ 
    }
  }
  if (!hits.length) return ''
  
  hits.sort((a, b) => a[0] - b[0])
  const merged: Array<[number, number]> = [hits[0]]
  for (let i = 1; i < hits.length; i++) {
    const last = merged[merged.length - 1]
    if (hits[i][0] <= last[1]) last[1] = Math.max(last[1], hits[i][1])
    else merged.push(hits[i])
  }
  
  const partes: string[] = []
  let usados = 0
  for (const [ini, fim] of merged) {
    const trecho = t.slice(ini, fim)
    if (usados + trecho.length > capTotal) { partes.push(t.slice(ini, ini + (capTotal - usados))); break }
    partes.push(trecho)
    usados += trecho.length
  }
  return partes.join('\n[...]\n').trim()
}


export function planejarPassadaLLM(texto: string): { rodar: boolean; secoes: string } {
  const secoes = fatiarSecoesComData(texto)
  return { rodar: secoes.length > 0, secoes }
}
