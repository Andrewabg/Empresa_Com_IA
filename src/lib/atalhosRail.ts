

export interface Atalho {
  nome: string
  url: string
}


export const ATALHOS_SETTING_KEY = 'atalhos_rail'


export const ATALHOS_MAX = 6


export const ATALHO_NOME_MAX = 40


export const ATALHO_URL_MAX = 2048


export const TEXTOS_ATALHOS_RAIL = {
  nomeObrigatorio: `Dê um nome para o atalho, com até ${ATALHO_NOME_MAX} caracteres.`,
  urlInvalida: 'Esse link não é válido. Use um endereço que comece com http:// ou https://.',
  limiteAtingido: `Você já tem o máximo de ${ATALHOS_MAX} atalhos fixados. Remova algum para adicionar outro.`,
  listaInvalida: 'Não foi possível salvar os atalhos.',
  
  carregarFalhou: 'Não deu para carregar os atalhos salvos.',
  
  salvo: 'Salvo. Já aparece no menu.',
  
  salvarFalhou: 'Não foi possível salvar. Tente de novo.',
  
  corpoInvalido: 'Não deu para entender o que foi enviado.',
} as const


export function validarUrlAtalho(raw: unknown): boolean {
  if (typeof raw !== 'string') return false
  const trimmed = raw.trim()
  if (!trimmed || trimmed.length > ATALHO_URL_MAX) return false
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return false
  }
  return url.protocol === 'http:' || url.protocol === 'https:'
}


export function nomeAtalhoValido(raw: unknown): boolean {
  if (typeof raw !== 'string') return false
  const trimmed = raw.trim()
  return trimmed.length > 0 && trimmed.length <= ATALHO_NOME_MAX
}

export type ValidacaoAtalhos =
  | { ok: true; atalhos: Atalho[] }
  | { ok: false; atalhos: []; erro: string }


export function validarAtalhos(raw: unknown): ValidacaoAtalhos {
  if (!Array.isArray(raw)) {
    return { ok: false, atalhos: [], erro: TEXTOS_ATALHOS_RAIL.listaInvalida }
  }
  if (raw.length > ATALHOS_MAX) {
    return { ok: false, atalhos: [], erro: TEXTOS_ATALHOS_RAIL.limiteAtingido }
  }
  const atalhos: Atalho[] = []
  
  
  
  
  const vistos = new Set<string>()
  for (const item of raw) {
    const nome = (item as { nome?: unknown } | null)?.nome
    const url = (item as { url?: unknown } | null)?.url
    if (!nomeAtalhoValido(nome)) {
      return { ok: false, atalhos: [], erro: TEXTOS_ATALHOS_RAIL.nomeObrigatorio }
    }
    if (!validarUrlAtalho(url)) {
      return { ok: false, atalhos: [], erro: TEXTOS_ATALHOS_RAIL.urlInvalida }
    }
    const nomeFinal = (nome as string).trim().slice(0, ATALHO_NOME_MAX)
    const urlFinal = (url as string).trim()
    const chave = urlFinal + nomeFinal
    if (vistos.has(chave)) continue
    vistos.add(chave)
    atalhos.push({ nome: nomeFinal, url: urlFinal })
  }
  return { ok: true, atalhos }
}


export function serializarAtalhosRail(atalhos: Atalho[]): string {
  return JSON.stringify(atalhos)
}


export function parseAtalhosRail(raw: string | null | undefined): Atalho[] {
  if (typeof raw !== 'string' || !raw.trim()) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  const resultado = validarAtalhos(parsed)
  return resultado.ok ? resultado.atalhos : []
}
