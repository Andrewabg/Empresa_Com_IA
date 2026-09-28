






export interface Tabela {
  name: string
  headers: string[]
  rows: string[][]
}





const MAX_ROWS = 5000
const SAMPLE = 3
const LOW_CARD_THRESHOLD = 12
const TOP_K = 3
const TRUNC_LEN = 40





const SMALL_TABLE_ROWS = 60



const KEY_TRANSCRIBE_MAX_ROWS = 5000


const KEY_CARDINALITY_MIN = 0.9






export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  if (text.trim() === '') return { headers: [], rows: [] }

  const records: string[][] = []
  let record: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"'
          i += 2
        } else {
          
          inQuotes = false
          i++
        }
      } else {
        field += ch
        i++
      }
    } else {
      if (ch === '"') {
        inQuotes = true
        i++
      } else if (ch === ',') {
        record.push(field)
        field = ''
        i++
      } else if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
        
        record.push(field)
        records.push(record)
        record = []
        field = ''
        i += 2
      } else if (ch === '\n') {
        record.push(field)
        records.push(record)
        record = []
        field = ''
        i++
      } else {
        field += ch
        i++
      }
    }
  }

  
  
  record.push(field)
  
  if (!(record.length === 1 && record[0] === '')) {
    records.push(record)
  }

  if (records.length === 0) return { headers: [], rows: [] }

  const headers = records[0]
  const rows = records.slice(1)
  return { headers, rows }
}





const NUM_RE = /^-?\d+([.,]\d+)?$/

function parseNumero(v: string): number {
  return parseFloat(v.replace(',', '.'))
}

function isNumeric(v: string): boolean {
  return NUM_RE.test(v.trim())
}


function arredondar2(n: number): string {
  
  const s = n.toFixed(2)
  if (s.includes('.')) {
    return s.replace(/\.?0+$/, '')
  }
  return s
}


function truncar(v: string): string {
  if (v.length > TRUNC_LEN) return v.slice(0, TRUNC_LEN) + '…'
  return v
}






export function summarizeTable(t: Tabela): string {
  const lines: string[] = []

  
  lines.push(`Planilha "${t.name}" — ${t.rows.length} linha(s), ${t.headers.length} coluna(s).`)

  
  const statRows = t.rows.length > MAX_ROWS ? t.rows.slice(0, MAX_ROWS) : t.rows
  if (t.rows.length > MAX_ROWS) {
    lines.push(`Estatística sobre as primeiras ${MAX_ROWS} de ${t.rows.length} linhas.`)
  }

  
  for (let ci = 0; ci < t.headers.length; ci++) {
    const header = t.headers[ci]
    const values = statRows
      .map(row => (row[ci] ?? ''))
      .filter(v => v.trim() !== '')

    let desc: string

    if (values.length === 0) {
      desc = '(vazia)'
    } else {
      
      const numericCount = values.filter(v => isNumeric(v)).length
      const isNumCol = numericCount / values.length >= 0.9

      if (isNumCol) {
        const nums = values.filter(v => isNumeric(v)).map(v => parseNumero(v))
        const min = Math.min(...nums)
        const max = Math.max(...nums)
        const avg = nums.reduce((a, b) => a + b, 0) / nums.length
        desc = `número, min ${arredondar2(min)}, máx ${arredondar2(max)}, média ${arredondar2(avg)}`
      } else {
        
        const freq = new Map<string, number>()
        for (const v of values) {
          freq.set(v, (freq.get(v) ?? 0) + 1)
        }
        const distinct = freq.size

        if (distinct <= LOW_CARD_THRESHOLD) {
          
          const sorted = Array.from(freq.entries()).sort((a, b) => {
            if (b[1] !== a[1]) return b[1] - a[1]   
            return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0  
          })
          const top = sorted.slice(0, TOP_K)
          const partes = top.map(([val, cnt]) => `${val} (${cnt})`).join(', ')
          desc = `texto — ${partes}`
        } else {
          desc = `texto — ~${distinct} valores distintos`
        }
      }
    }

    lines.push(`- ${header}: ${desc}`)
  }

  
  if (t.rows.length === 0) {
    lines.push('Amostra: (sem linhas)')
  } else {
    lines.push('Amostra:')
    const sampleRows = t.rows.slice(0, SAMPLE)
    for (const row of sampleRows) {
      const pairs = t.headers
        .map((h, ci) => `${h}=${truncar(row[ci] ?? '')}`)
        .join('; ')
      lines.push(`  • ${pairs}`)
    }
  }

  return lines.join('\n')
}






function escaparCelulaMd(v: string): string {
  return v.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}


function tabelaComoMarkdown(t: Tabela): string {
  const cols = Math.max(t.headers.length, ...t.rows.map(r => r.length), 0)
  const headers = Array.from({ length: cols }, (_, i) => t.headers[i] ?? '')

  const lines: string[] = []
  lines.push(`Planilha "${t.name}" — ${t.rows.length} linha(s), ${cols} coluna(s). Tabela transcrita na íntegra:`)
  lines.push('')
  lines.push('| ' + headers.map(escaparCelulaMd).join(' | ') + ' |')
  lines.push('| ' + headers.map(() => '---').join(' | ') + ' |')
  for (const row of t.rows) {
    const cells = Array.from({ length: cols }, (_, i) => escaparCelulaMd(row[i] ?? ''))
    lines.push('| ' + cells.join(' | ') + ' |')
  }
  return lines.join('\n')
}


function detectarColunaChave(t: Tabela): number {
  const nRows = t.rows.length
  if (nRows === 0) return -1

  let bestCol = -1
  let bestCard = 0

  for (let ci = 0; ci < t.headers.length; ci++) {
    const values = t.rows.map(r => (r[ci] ?? '')).filter(v => v.trim() !== '')
    if (values.length === 0) continue

    
    
    const numericCount = values.filter(v => isNumeric(v)).length
    if (numericCount / values.length >= 0.9) continue

    const distinct = new Set(values).size
    const cardinality = distinct / values.length
    if (cardinality >= KEY_CARDINALITY_MIN && cardinality > bestCard) {
      bestCard = cardinality
      bestCol = ci
    }
  }

  return bestCol
}


function distintosOrdenados(t: Tabela, ci: number): string[] {
  const set = new Set<string>()
  for (const row of t.rows) {
    const v = (row[ci] ?? '').trim()
    if (v !== '') set.add(v)
  }
  return Array.from(set).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}


export function tabelaParaTexto(t: Tabela): string {
  
  if (t.rows.length <= SMALL_TABLE_ROWS) {
    return tabelaComoMarkdown(t)
  }

  
  if (t.rows.length <= KEY_TRANSCRIBE_MAX_ROWS) {
    const keyCol = detectarColunaChave(t)
    if (keyCol >= 0) {
      const distintos = distintosOrdenados(t, keyCol)
      const header = t.headers[keyCol] || `coluna ${keyCol + 1}`
      const lines: string[] = []
      lines.push(summarizeTable(t))
      lines.push('')
      lines.push(`Valores distintos de "${header}" (${distintos.length}):`)
      lines.push(distintos.join(', '))
      return lines.join('\n')
    }
    
    return summarizeTable(t)
  }

  
  const resumo = summarizeTable(t)
  return `${resumo}\n\n(Tabela grande — resumo estatístico; ${t.rows.length} linhas não transcritas na íntegra.)`
}
