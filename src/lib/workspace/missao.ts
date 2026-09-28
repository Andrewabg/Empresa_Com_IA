




const MAX_CHARS = 140

export function missaoCurta(systemPrompt: string | null | undefined, fallback: string): string {
  if (!systemPrompt) return fallback
  
  
  
  
  const m = systemPrompt.match(/^#{1,4}\s*Identidade\b[^\n]*\n+([\s\S]*?)(?=\n#{1,4}\s|(?![\s\S]))/im)
  const corpo = m?.[1]?.trim()
  if (!corpo) return fallback
  const linha = corpo.split('\n').map((l) => l.trim()).find((l) => l.length > 0 && !/^[-+*]+$/.test(l))
  if (!linha) return fallback
  
  
  
  const semOrdenada = linha.replace(/^\d+[.)]\s+/, '')
  
  const semLista = semOrdenada.replace(/^[-+*]\s+/, '')
  
  
  const semMd = semLista.replace(/[*_`>#]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!semMd) return fallback
  
  const semEspacoPontuacao = semMd.replace(/\s+([,.;:!?])/g, '$1')
  const fim = semEspacoPontuacao.search(/[.!?](\s|$)/)
  const frase = fim >= 0 ? semEspacoPontuacao.slice(0, fim + 1) : semEspacoPontuacao
  return frase.length > MAX_CHARS ? frase.slice(0, MAX_CHARS - 1).trimEnd() + '…' : frase
}
