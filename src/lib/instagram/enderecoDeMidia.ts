


















export const ZONAS_DE_CDN_DA_META = ['cdninstagram.com', 'fbcdn.net'] as const


export const NOMES_EXATOS_DA_META = ['instagram.com', 'www.instagram.com'] as const


export const TETO_ENDERECO_DE_MIDIA = 2048


export const ERRO_ENDERECO_DE_MIDIA =
  'Não reconheci a publicação escolhida. Escolha uma publicação na lista desta tela.'

export type LeituraDeEndereco =
  
  | { ok: true; valor: string | null }
  
  | { ok: false }


const ROTULO_DE_PROXY_DA_META = /^external(-|$)/

function daMeta(hostname: string): boolean {
  
  
  const nome = hostname.replace(/\.$/, '')
  if (NOMES_EXATOS_DA_META.some((n) => nome === n)) return true
  
  
  
  
  if (nome.split('.').some((r) => ROTULO_DE_PROXY_DA_META.test(r))) return false
  return ZONAS_DE_CDN_DA_META.some((d) => nome === d || nome.endsWith('.' + d))
}


export function lerEnderecoDeMidia(v: unknown): LeituraDeEndereco {
  if (typeof v !== 'string') return { ok: true, valor: null }
  const bruto = v.trim()
  if (bruto === '') return { ok: true, valor: null }
  if (bruto.length > TETO_ENDERECO_DE_MIDIA) return { ok: false }
  let u: URL
  try { u = new URL(bruto) } catch { return { ok: false } }
  if (u.protocol !== 'https:') return { ok: false }
  if (u.username !== '' || u.password !== '') return { ok: false }
  if (!daMeta(u.hostname)) return { ok: false }
  return { ok: true, valor: bruto }
}


export function enderecoDeMidiaConfiavel(v: unknown): string | null {
  const r = lerEnderecoDeMidia(v)
  return r.ok ? r.valor : null
}
