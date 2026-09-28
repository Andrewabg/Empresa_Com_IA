










import { CHUNK_TETO_CHARS, MERGE_PEER_MIN_CHARS } from './chunking'
import { splitUnit, splitSentences } from './textSplit'

export interface StructuredChunk {
  
  text: string
  
  heading_path: string
}

interface Secao {
  
  headingPath: string[]
  
  corpo: string
}

const HEADING_RE = /^(#{1,6})\s+(.*)$/


const breadcrumb = (path: string[]): string => path.join(' > ')


function extrairSecoes(md: string): Secao[] {
  const linhas = md.split('\n')
  const secoes: Secao[] = []
  const pilha: string[] = [] 
  let corpo: string[] = []
  const flush = () => {
    const txt = corpo.join('\n').trim()
    if (txt) secoes.push({ headingPath: [...pilha], corpo: txt })
    corpo = []
  }
  for (const linha of linhas) {
    const m = linha.match(HEADING_RE)
    if (m) {
      flush()
      const nivel = m[1].length
      pilha.length = nivel - 1 
      pilha[nivel - 1] = m[2].trim() 
    } else {
      corpo.push(linha)
    }
  }
  flush()
  return secoes
}


const paiPath = (path: string[]): string[] => path.slice(0, -1)


function corpoComHeading(s: Secao): string {
  const proprio = s.headingPath[s.headingPath.length - 1]
  return proprio ? `${proprio}\n${s.corpo}` : s.corpo
}


interface Unidade {
  headingPath: string[]
  corpo: string
}


function mergePeers(secoes: Secao[], teto: number, piso: number): Unidade[] {
  const out: Unidade[] = []
  let i = 0
  while (i < secoes.length) {
    const s = secoes[i]
    const pai = paiPath(s.headingPath)
    const curta = (x: Secao) => corpoComHeading(x).length < piso

    
    
    
    
    
    if (pai.length > 0 && curta(s) && i + 1 < secoes.length) {
      const grupo: Secao[] = [s]
      let tam = corpoComHeading(s).length
      let j = i + 1
      while (
        j < secoes.length &&
        curta(secoes[j]) &&
        arraysIguais(paiPath(secoes[j].headingPath), pai) &&
        tam + 1 + corpoComHeading(secoes[j]).length <= teto
      ) {
        tam += 1 + corpoComHeading(secoes[j]).length
        grupo.push(secoes[j])
        j++
      }
      if (grupo.length > 1) {
        
        out.push({ headingPath: pai, corpo: grupo.map(corpoComHeading).join('\n\n') })
        i = j
        continue
      }
    }

    
    out.push({ headingPath: s.headingPath, corpo: s.corpo })
    i++
  }
  return out
}


function arraysIguais(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) return false
  return true
}


const OVERLAP_MAX_CHARS = 300


function overlapTail(anterior: string): string {
  const frases = splitSentences(anterior)
  const ultima = (frases[frases.length - 1] ?? '').trim()
  if (ultima && ultima.length <= OVERLAP_MAX_CHARS) return ultima
  
  
  let tail = anterior.slice(anterior.length - OVERLAP_MAX_CHARS)
  const esp = tail.indexOf(' ')
  if (esp > 0 && esp < tail.length - 1) tail = tail.slice(esp + 1)
  return tail.trim()
}


function subSplitComOverlap(corpo: string, teto: number): string[] {
  const base = splitUnit(corpo, teto)
  if (base.length <= 1) return base
  const out: string[] = [base[0]]
  for (let k = 1; k < base.length; k++) {
    const cauda = overlapTail(base[k - 1])
    const pedaco = base[k]
    out.push(cauda ? `${cauda} ${pedaco}` : pedaco)
  }
  return out
}


export function chunkStructural(
  text: string,
  opts: { teto?: number; pisoMerge?: number } = {},
): StructuredChunk[] {
  if (!text.trim()) return []
  const teto = opts.teto ?? CHUNK_TETO_CHARS
  const piso = opts.pisoMerge ?? MERGE_PEER_MIN_CHARS

  const unidades = mergePeers(extrairSecoes(text), teto, piso)

  const out: StructuredChunk[] = []
  for (const u of unidades) {
    const bc = breadcrumb(u.headingPath)
    const prefixar = (corpo: string): string => (bc ? `${bc}\n\n${corpo}` : corpo).trim()

    const completo = prefixar(u.corpo)
    if (completo.length <= teto) {
      if (completo) out.push({ text: completo, heading_path: bc })
      continue
    }
    
    for (const pedaco of subSplitComOverlap(u.corpo, teto)) {
      const t = prefixar(pedaco)
      if (t) out.push({ text: t, heading_path: bc })
    }
  }
  return out.filter(c => c.text)
}
