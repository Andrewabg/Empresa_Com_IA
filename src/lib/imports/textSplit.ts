











const ABBREVIATIONS = [
  'Sr', 'Sra', 'Srs', 'Sras', 'Dr', 'Dra', 'Drs', 'Dras', 'Me', 'Prof', 'Profa',
  'Ltda', 'Av', 'art', 'arts', 'inc', 'pag', 'ex', 'etc',
  'Cia', 'Exmo', 'Exma', 'Ilmo', 'Ilma', 'Jr',
]




function isSentenceBoundary(text: string, i: number): boolean {
  const ch = text[i]
  if (ch !== '.' && ch !== '!' && ch !== '?' && ch !== '…') return false
  const next = text[i + 1]
  if (next !== undefined && !/\s/.test(next)) return false

  if (ch === '.') {
    if (/\d/.test(text[i - 1] ?? '') && /\d/.test(text[i + 1] ?? '')) return false
    let j = i - 1
    while (j >= 0 && /[^\s.]/.test(text[j])) j--
    const word = text.slice(j + 1, i)
    if (ABBREVIATIONS.includes(word)) return false
    if (word.length === 1 && /[A-Za-zÀ-ÿ]/.test(word)) return false
  }
  return true
}


export function splitSentences(text: string): string[] {
  const parts: string[] = []
  let start = 0
  for (let i = 0; i < text.length; i++) {
    if (isSentenceBoundary(text, i)) {
      let j = i + 1
      while (j < text.length && /\s/.test(text[j])) j++
      parts.push(text.slice(start, j))
      start = j
      i = j - 1
    }
  }
  if (start < text.length) parts.push(text.slice(start))
  return parts.length ? parts : [text]
}




function wouldSplitCurrency(text: string, cut: number): boolean {
  let a = cut - 1
  while (a >= 0 && /\S/.test(text[a])) a--
  const before = text.slice(a + 1, cut)
  const afterStart = text[cut + 1] ?? ''
  return /^(R\$|US\$|\$|€|£)$/.test(before) && /\d/.test(afterStart)
}


function splitByWord(text: string, max: number): string[] {
  const out: string[] = []
  let rest = text
  while (rest.length > max) {
    let cut = rest.lastIndexOf(' ', max)
    
    while (cut > 0 && wouldSplitCurrency(rest, cut)) {
      cut = rest.lastIndexOf(' ', cut - 1)
    }
    if (cut <= 0) cut = max 
    out.push(rest.slice(0, cut))
    rest = rest.slice(cut).replace(/^\s+/, '') 
  }
  if (rest.length) out.push(rest)
  return out
}




export function splitUnit(unit: string, max: number): string[] {
  if (unit.length <= max) return [unit]

  const paras = mergeSeparators(unit.split(/(\n{2,})/))
  if (paras.length > 1) {
    return packSegments(paras, max, p => splitUnit(p, max))
  }

  const lines = mergeSeparators(unit.split(/(\n)/))
  if (lines.length > 1) {
    return packSegments(lines, max, l => splitLineOrSmaller(l, max))
  }

  return splitLineOrSmaller(unit, max)
}


function splitLineOrSmaller(line: string, max: number): string[] {
  if (line.length <= max) return [line]
  const sents = splitSentences(line)
  if (sents.length > 1) {
    return packSegments(sents, max, s => splitByWord(s, max))
  }
  return splitByWord(line, max)
}


function mergeSeparators(parts: string[]): string[] {
  const units: string[] = []
  for (let i = 0; i < parts.length; i += 2) {
    const content = parts[i] ?? ''
    const sep = parts[i + 1] ?? ''
    units.push(content + sep)
  }
  return units.filter(u => u.length > 0)
}


function packSegments(
  segments: string[],
  max: number,
  splitBig: (s: string) => string[],
): string[] {
  const out: string[] = []
  let cur = ''
  for (const seg of segments) {
    if (seg.length > max) {
      if (cur) { out.push(cur); cur = '' }
      for (const piece of splitBig(seg)) out.push(piece)
      continue
    }
    if (cur && cur.length + seg.length > max) {
      out.push(cur)
      cur = seg
    } else {
      cur += seg
    }
  }
  if (cur) out.push(cur)
  return out
}
