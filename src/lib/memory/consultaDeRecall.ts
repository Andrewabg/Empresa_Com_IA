






















import { precisaRecall, temMarcadorDeRetomada } from './recallGate'


export const TETO_FALA_ANTERIOR = 280


export const LIMIAR_SEGUIMENTO = 24


export function ehSeguimentoCurto(falaAtual: string): boolean {
  const t = falaAtual.trim()
  if (!t) return false
  return t.length <= LIMIAR_SEGUIMENTO && temMarcadorDeRetomada(t)
}


export function recortarFalaAnterior(texto: string, teto = TETO_FALA_ANTERIOR): string {
  const limpo = texto.replace(/\s+/g, ' ').trim()
  if (limpo.length <= teto) return limpo
  const janela = limpo.slice(0, teto)
  const ultimoEspaco = janela.lastIndexOf(' ')
  return ultimoEspaco > 0 ? janela.slice(0, ultimoEspaco) : janela
}


export function montarConsultaDeRecall(falaAtual: string, falaAnterior?: string | null): string {
  if (!falaAnterior) return falaAtual
  if (!ehSeguimentoCurto(falaAtual)) return falaAtual
  const anterior = recortarFalaAnterior(falaAnterior)
  if (!anterior) return falaAtual
  return `${anterior}\n${falaAtual}`
}


export function precisaBuscaNoTranscrito(texto: string): boolean {
  return precisaRecall(texto) && !ehSeguimentoCurto(texto)
}


export interface FalaDoHistorico {
  role?: string | null
  content?: string | null
}


export function falaAnteriorDoUsuario(
  historico: ReadonlyArray<FalaDoHistorico>,
  falaAtual: string,
): string | undefined {
  const atual = falaAtual.trim()
  for (let i = historico.length - 1; i >= 0; i--) {
    const m = historico[i]
    if (m?.role !== 'user') continue
    const texto = (m.content ?? '').trim()
    if (!texto) continue
    if (texto === atual) continue
    return texto
  }
  return undefined
}
