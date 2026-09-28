









import { contarPalavras, segundosDeFala } from '@/lib/qa/portoes'


export const SEGUNDOS_MINIMOS_DE_CENA = 2


export interface Cena {
  
  inicioS: number
  
  fimS: number
  
  fala: string
  
  acao: string
  
  textoNaTela: string
  
  bRoll: string
}


export type CenaCrua = Omit<Cena, 'inicioS' | 'fimS'>

const limpar = (s: unknown): string =>
  typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : ''


export function duracaoDaCena(cena: CenaCrua): number {
  return Math.max(SEGUNDOS_MINIMOS_DE_CENA, segundosDeFala(contarPalavras(cena.fala ?? '')))
}


export function montarLinhaDoTempo(cruas: CenaCrua[]): Cena[] {
  const out: Cena[] = []
  let acumulado = 0
  for (const c of cruas ?? []) {
    const inicio = acumulado
    acumulado += duracaoDaCena(c)
    out.push({
      inicioS: Math.round(inicio),
      fimS: Math.round(acumulado),
      fala: limpar(c.fala),
      acao: limpar(c.acao),
      textoNaTela: limpar(c.textoNaTela),
      bRoll: limpar(c.bRoll),
    })
  }
  return out
}


export function formatarTimecode(segundos: number): string {
  const s = Math.max(0, Math.round(Number.isFinite(segundos) ? segundos : 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}


export function faixaDaCena(cena: Cena): string {
  return `${formatarTimecode(cena.inicioS)} a ${formatarTimecode(cena.fimS)}`
}


export function textoDaCena(cena: Cena): string {
  const linhas = [faixaDaCena(cena)]
  if (cena.fala) linhas.push(`Fala: ${cena.fala}`)
  if (cena.acao) linhas.push(`Ação: ${cena.acao}`)
  if (cena.textoNaTela) linhas.push(`Na tela: ${cena.textoNaTela}`)
  if (cena.bRoll) linhas.push(`B-roll: ${cena.bRoll}`)
  return linhas.join('\n')
}
