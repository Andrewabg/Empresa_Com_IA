

export type DiffLineKind = 'add' | 'del' | 'context' | 'hunk' | 'header'

export interface DiffLine {
  kind: DiffLineKind
  
  text: string
  
  raw: string
}



export function ehDiffUnificado(src: string): boolean {
  return /^@@[^\n]*@@/m.test(src) || (/^--- /m.test(src) && /^\+\+\+ /m.test(src))
}


export function parseParaExibicao(src: string): DiffLine[] {
  if (!src || src.trim() === '') return []
  if (ehDiffUnificado(src)) return parseUnifiedDiff(src)
  return src
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((raw): DiffLine => ({ kind: 'context', text: raw, raw }))
}

export function parseUnifiedDiff(src: string): DiffLine[] {
  if (!src || src.trim() === '') return []

  
  const lines = src.replace(/\r\n?/g, '\n').split('\n')

  return lines.map((raw): DiffLine => {
    
    if (raw.startsWith('--- ') || raw.startsWith('+++ ')) {
      return { kind: 'header', text: raw, raw }
    }
    
    if (raw.startsWith('@@')) {
      return { kind: 'hunk', text: raw, raw }
    }
    
    if (raw.startsWith('+')) {
      return { kind: 'add', text: raw.slice(1), raw }
    }
    if (raw.startsWith('-')) {
      return { kind: 'del', text: raw.slice(1), raw }
    }
    
    return { kind: 'context', text: raw.startsWith(' ') ? raw.slice(1) : raw, raw }
  })
}
