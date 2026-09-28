










import { createHash } from 'node:crypto'
import { carimboDaFonte } from './mensagens'


const MARCA = /^<!-- awave-fonte 1 ([0-9a-f]{64}) -->$/

const linhaDaMarca = (assinatura: string) => `<!-- awave-fonte 1 ${assinatura} -->`


const semCR = (texto: string) => texto.replace(/\r\n/g, '\n')


function assinar(cabecalho: string, miolo: string): string {
  return createHash('sha256').update(`${cabecalho}\n${miolo}`).digest('hex')
}


export function montarCorpoCarimbado(corpo: string, data: string): string {
  const cabecalho = `_${carimboDaFonte(data)}_`
  const miolo = semCR(corpo).trim()
  return `${cabecalho}\n${linhaDaMarca(assinar(cabecalho, miolo))}\n\n${miolo}`
}


export function notaAindaENossa(corpoExistente: string): boolean {
  const linhas = semCR(corpoExistente).split('\n')
  const casou = MARCA.exec((linhas[1] ?? '').trim())
  if (!casou) return false
  return assinar(linhas[0], linhas.slice(2).join('\n').trim()) === casou[1]
}
