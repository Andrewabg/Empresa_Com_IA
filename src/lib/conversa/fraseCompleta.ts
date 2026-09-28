



const FECHAMENTOS = '"”’\')]'


export function fimDaFrasePorPontuacao(
  texto: string,
  i: number,
  fechaTambem?: (texto: string, j: number) => number,
): number {
  const c = texto[i]
  if (c !== '.' && c !== '!' && c !== '?' && c !== '…') return -1
  let j = i + 1
  while (j < texto.length) {
    if (FECHAMENTOS.includes(texto[j])) { j += 1; continue }
    const extra = fechaTambem ? fechaTambem(texto, j) : 0
    if (extra <= 0) break
    j += extra
  }
  return j >= texto.length || /\s/.test(texto[j]) ? j : -1
}




const MARCAS_DO_WHATSAPP = '*_~'

const EMOJI = /^[\p{Extended_Pictographic}\p{Emoji_Modifier}‍️]/u

function marcaOuEmoji(texto: string, j: number): number {
  if (MARCAS_DO_WHATSAPP.includes(texto[j])) return 1
  const ponto = texto.codePointAt(j)
  if (ponto === undefined) return 0
  const ch = String.fromCodePoint(ponto)
  return EMOJI.test(ch) ? ch.length : 0
}


const ABREVIACOES = new Set([
  
  'sr', 'sra', 'srta', 'srs', 'sras', 'dr', 'dra', 'drs', 'dras', 'prof', 'profa', 'profª',
  'exmo', 'exma', 'eng', 'enga', 'sto', 'sta',
  
  'av', 'al', 'trav', 'tv', 'rod', 'estr', 'pça', 'jd', 'vl', 'apto', 'ap', 'bl', 'cj', 'ed', 'qd',
  
  'nº', 'n', 'núm', 'num', 'pág', 'pag', 'cap', 'vol', 'tel', 'cel', 'aprox', 'obs', 'ex',
  
  'ltda', 'cia',
])


function palavraAntes(texto: string, i: number): string {
  let k = i
  while (k > 0 && /\p{L}/u.test(texto[k - 1])) k -= 1
  return texto.slice(k, i).toLowerCase()
}


function ehAbreviacao(texto: string, i: number): boolean {
  if (texto[i] !== '.') return false
  if (/\p{L}/u.test(texto[i - 1] ?? '') && /\d/.test(texto[i - 2] ?? '')) return false
  const palavra = palavraAntes(texto, i)
  return palavra.length === 1 || ABREVIACOES.has(palavra)
}


function ehNumeroDeItem(texto: string, i: number): boolean {
  if (texto[i] !== '.') return false
  const inicioDaLinha = texto.lastIndexOf('\n', i - 1) + 1
  return /^\s*(?:[-*•]\s*)?\d+$/.test(texto.slice(inicioDaLinha, i))
}


export function ateAUltimaFraseCompleta(texto: string): string {
  for (let i = texto.length - 1; i >= 0; i -= 1) {
    const fim = fimDaFrasePorPontuacao(texto, i, marcaOuEmoji)
    if (fim < 0 || ehAbreviacao(texto, i) || ehNumeroDeItem(texto, i)) continue
    return texto.slice(0, fim)
  }
  return ''
}
