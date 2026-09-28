
import { VALOR_MAX } from '@/lib/memory/fichaEmpresa'


const ESTRUTURA: readonly RegExp[] = [
  /^#{1,6}(\s|$)/,             
  /^(-{3,}|\*{3,}|_{3,})$/,    
  /^(```|~~~)/,                
]


const MARCADOR_LISTA = /^(?:[-*+]|\d{1,3}[.)])\s+/

const MARCADOR_CITACAO = /^>+\s*/


function ateOFimDaFrase(linha: string): string {
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]
    if (c !== '.' && c !== '!' && c !== '?') continue
    const proximo = linha[i + 1]
    if (c === '.' && /\d/.test(linha[i - 1] ?? '') && /\d/.test(proximo ?? '')) continue
    if (proximo === undefined || /\s/.test(proximo)) return linha.slice(0, i + 1)
  }
  return linha
}


function caparEmPalavra(s: string, max: number): string {
  const colapsado = s.replace(/\s+/g, ' ').trim()
  if (colapsado.length <= max) return colapsado
  const corte = colapsado.slice(0, max - 1) 
  const ultimoEspaco = corte.lastIndexOf(' ')
  return `${(ultimoEspaco > 0 ? corte.slice(0, ultimoEspaco) : corte).trimEnd()}…`
}


export function primeiraFraseUtil(corpo: string | null | undefined, max: number = VALOR_MAX): string {
  for (const bruta of (corpo ?? '').split(/\r?\n/)) {
    const linha = bruta.trim()
    if (!linha) continue
    if (ESTRUTURA.some((re) => re.test(linha))) continue
    const conteudo = linha.replace(MARCADOR_CITACAO, '').replace(MARCADOR_LISTA, '').trim()
    if (!conteudo) continue
    return caparEmPalavra(ateOFimDaFrase(conteudo), max)
  }
  return ''
}
