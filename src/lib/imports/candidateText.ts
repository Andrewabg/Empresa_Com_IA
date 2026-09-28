



export interface CandidateFields {
  titulo: string
  corpo: string
}


export function parseCandidate(raw: string): CandidateFields {
  const text = raw ?? ''
  if (text.startsWith('# ')) {
    const nl = text.indexOf('\n')
    if (nl === -1) return { titulo: text.slice(2).trim(), corpo: '' }
    const titulo = text.slice(2, nl).trim()
    
    const corpo = text.slice(nl + 1).replace(/^\n/, '')
    return { titulo, corpo }
  }
  return { titulo: '', corpo: text }
}


export function formatCandidate(titulo: string, corpo: string): string {
  const t = (titulo ?? '').trim()
  const c = (corpo ?? '').trim()
  return `# ${t}\n\n${c}`
}
