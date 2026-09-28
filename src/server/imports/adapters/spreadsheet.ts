





import ExcelJS from 'exceljs'
import { parseCsv, tabelaParaTexto } from '@/lib/imports/planilha'
import type { Tabela } from '@/lib/imports/planilha'


function cellToString(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'object') {
    const o = v as {
      text?: unknown
      result?: unknown
      richText?: Array<{ text?: unknown }>
    }
    
    if (Array.isArray(o.richText)) {
      return o.richText.map(p => String(p?.text ?? '')).join('')
    }
    
    if (o.text !== undefined) return String(o.text)
    
    if (o.result !== undefined) return String(o.result ?? '')
  }
  return String(v)
}


function worksheetParaTabela(ws: ExcelJS.Worksheet, name: string): Tabela {
  const collected: string[][] = []
  ws.eachRow({ includeEmpty: false }, row => {
    const cells: string[] = []
    for (let c = 1; c <= ws.columnCount; c++) {
      cells.push(cellToString(row.getCell(c).value))
    }
    collected.push(cells)
  })

  let headers: string[] = collected[0] ?? []
  const rows = collected.slice(1)

  
  while (headers.length > 0 && headers[headers.length - 1].trim() === '') {
    headers = headers.slice(0, -1)
  }

  return { name, headers, rows }
}


export async function extractSpreadsheet(
  bytes: Uint8Array,
  mime: string | null,
  filename: string,
): Promise<string> {
  const isCsv = filename.toLowerCase().endsWith('.csv') || mime === 'text/csv'

  if (isCsv) {
    const text = new TextDecoder('utf-8').decode(bytes)
    const { headers, rows } = parseCsv(text)
    
    return tabelaParaTexto({ name: filename, headers, rows })
  }

  
  const wb = new ExcelJS.Workbook()
  
  
  
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  await wb.xlsx.load(ab as Parameters<typeof wb.xlsx.load>[0])

  const sheets = wb.worksheets
  if (sheets.length === 0) {
    
    return tabelaParaTexto({ name: filename, headers: [], rows: [] })
  }

  
  
  if (sheets.length === 1) {
    return tabelaParaTexto(worksheetParaTabela(sheets[0], filename))
  }

  const blocos: string[] = []
  for (const ws of sheets) {
    const tabela = worksheetParaTabela(ws, ws.name || 'aba')
    blocos.push(`## Aba: ${ws.name || 'aba'}\n\n${tabelaParaTexto(tabela)}`)
  }
  return blocos.join('\n\n')
}
