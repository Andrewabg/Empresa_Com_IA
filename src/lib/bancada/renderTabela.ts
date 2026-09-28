



import { campoSeguro } from '@/lib/fontes/sanitizar'
import { TETO_CHARS_DA_SAIDA, TETO_LINHAS_DA_SAIDA } from './tipos'

const SEP = ' ¦ '


export function celulaSegura(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number' || typeof v === 'bigint') return String(v)
  return campoSeguro(String(v)).replace(/[|¦]/g, '/')
}


function cortarHeader(header: string, maxChars: number): string {
  if (header.length <= maxChars) return header
  const corte = header.lastIndexOf(SEP, maxChars)
  return corte >= 0 ? header.slice(0, corte) : header.slice(0, maxChars)
}

export function renderTabela(
  colunas: string[],
  linhas: unknown[][],
  opts: { maxLinhas?: number; maxChars?: number } = {},
): { texto: string; linhasMostradas: number; cortouLinhas: boolean; cortouChars: boolean } {
  const maxLinhas = opts.maxLinhas ?? TETO_LINHAS_DA_SAIDA
  const maxChars = opts.maxChars ?? TETO_CHARS_DA_SAIDA
  const headerCompleto = colunas.map(celulaSegura).join(SEP)
  const header = cortarHeader(headerCompleto, maxChars)
  const partes = [header]
  let usado = header.length
  let mostradas = 0
  let cortouChars = header.length < headerCompleto.length
  for (const linha of linhas) {
    if (mostradas >= maxLinhas) break
    const l = linha.map(celulaSegura).join(SEP)
    if (usado + 1 + l.length > maxChars) { cortouChars = true; break }
    partes.push(l); usado += 1 + l.length; mostradas++
  }
  return { texto: partes.join('\n'), linhasMostradas: mostradas, cortouLinhas: mostradas < linhas.length && !cortouChars, cortouChars }
}
