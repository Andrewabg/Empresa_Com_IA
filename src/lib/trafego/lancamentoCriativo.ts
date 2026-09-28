


export const CTAS_VALIDOS = new Set<string>([
  'LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'SUBSCRIBE', 'BOOK_TRAVEL', 'CONTACT_US',
  'GET_QUOTE', 'SEND_MESSAGE', 'ORDER_NOW', 'DOWNLOAD', 'APPLY_NOW', 'WHATSAPP_MESSAGE',
])
const CTA_DEFAULT = 'LEARN_MORE'


export function normalizarCta(cta?: string): string {
  const c = (cta ?? '').trim().toUpperCase()
  return CTAS_VALIDOS.has(c) ? c : CTA_DEFAULT
}

export const CTA_LABEL_PT: Record<string, string> = {
  LEARN_MORE: 'Saiba mais', SHOP_NOW: 'Comprar agora', SIGN_UP: 'Cadastre-se',
  SUBSCRIBE: 'Inscrever-se', BOOK_TRAVEL: 'Reservar', CONTACT_US: 'Fale conosco',
  GET_QUOTE: 'Pedir orçamento', SEND_MESSAGE: 'Enviar mensagem', ORDER_NOW: 'Peça já',
  DOWNLOAD: 'Baixar', APPLY_NOW: 'Candidatar-se', WHATSAPP_MESSAGE: 'Enviar no WhatsApp',
}


export function rotuloCta(cta?: string): string {
  const c = (cta ?? '').trim().toUpperCase()
  return CTA_LABEL_PT[c] ?? (cta ?? '')
}


export function linkValido(link?: string): boolean {
  const s = (link ?? '').trim()
  if (!s) return false
  try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:' } catch { return false }
}

export interface LancamentoResolvido {
  accountId: string
  adsetId: string
  pageId: string
  igUserId?: string
  artifactId: string
  message: string
  link: string
  cta: string          
  name: string
  headline?: string
  conjuntoNome?: string
  paginaNome?: string
  arteNome?: string
}


export function avaliarLancamento(
  p: { message?: string; link?: string; artifactId?: string },
): { ok: true } | { ok: false; motivo: string } {
  if (!p.artifactId || !p.artifactId.trim())
    return { ok: false, motivo: 'Preciso da arte pra subir — gere/finalize um criativo no /design primeiro.' }
  if (!p.message || !p.message.trim())
    return { ok: false, motivo: 'Preciso do texto do anúncio (a mensagem principal) pra montar o criativo.' }
  if (!linkValido(p.link))
    return { ok: false, motivo: 'Preciso de um link de destino válido (http/https) — eu não invento URL.' }
  return { ok: true }
}


export function extrairLinkDeAnuncio(ad: unknown): string | undefined {
  const a = (ad ?? {}) as Record<string, unknown>
  const cr = (a.creative ?? {}) as Record<string, unknown>
  const oss = (cr.object_story_spec ?? {}) as Record<string, unknown>
  const ld = (oss.link_data ?? {}) as Record<string, unknown>
  if (typeof ld.link === 'string' && ld.link) return ld.link
  const afs = (cr.asset_feed_spec ?? {}) as Record<string, unknown>
  const urls = afs.link_urls as Array<{ website_url?: unknown }> | undefined
  if (urls?.length && typeof urls[0]?.website_url === 'string' && urls[0].website_url) return urls[0].website_url
  return undefined
}


export function resolverLink(
  args: { linkDono?: string; linksConjunto: string[] },
): { ok: true; link: string; aviso?: string } | { ok: false; motivo: string } {
  const dono = (args.linkDono ?? '').trim()
  const conj = args.linksConjunto.filter((l) => !!l)
  if (dono) {
    if (!linkValido(dono)) return { ok: false, motivo: 'Preciso de um link de destino válido (http/https) — eu não invento URL.' }
    const aviso = conj.length && !conj.includes(dono)
      ? `Atenção: esse link é diferente do que o conjunto usa hoje (${conj[0]}).`
      : undefined
    return { ok: true, link: dono, aviso }
  }
  if (conj.length) {
    return { ok: true, link: conj[0], aviso: `Usei o link do anúncio atual do conjunto (${conj[0]}) — confirme; se sua landing for outra, edita na aprovação.` }
  }
  return { ok: false, motivo: 'Não achei link nos anúncios desse conjunto e você não passou um. Me diga pra onde mandar o tráfego (o link de destino).' }
}


export function montarCreativeBody(p: LancamentoResolvido, pictureUrl: string): Record<string, unknown> {
  const linkData: Record<string, unknown> = {
    picture: pictureUrl, link: p.link, message: p.message,
    call_to_action: { type: p.cta, value: { link: p.link } },
  }
  if (p.headline && p.headline.trim()) linkData.name = p.headline.trim()
  const oss: Record<string, unknown> = { page_id: p.pageId, link_data: linkData }
  if (p.igUserId) oss.instagram_user_id = p.igUserId
  return { name: p.name, object_story_spec: oss }
}


export function montarAdBody(p: LancamentoResolvido, creativeId: string): Record<string, unknown> {
  return { name: p.name, adset_id: p.adsetId, creative: { creative_id: creativeId }, status: 'PAUSED' }
}


export function contaEndpoint(accountId: string): string {
  const raw = (accountId ?? '').trim()
  return `/act_${raw.startsWith('act_') ? raw.slice(4) : raw}`
}


export function extrairIgUserId(pageNode: unknown): string | undefined {
  const n = (pageNode ?? {}) as Record<string, unknown>
  const biz = (n.instagram_business_account as { id?: unknown } | undefined)?.id
  if (biz) return String(biz)
  const conn = (n.connected_instagram_account as { id?: unknown } | undefined)?.id
  if (conn) return String(conn)
  const accs = (n.instagram_accounts as { data?: Array<{ id?: unknown }> } | undefined)?.data
  if (accs?.length && accs[0]?.id) return String(accs[0].id)
  return undefined
}

export interface PaginaMeta { id: string; name: string }


export function escolherPagina(paginas: PaginaMeta[], query?: string):
  | { ok: true; pagina: PaginaMeta } | { ok: false; motivo: string } {
  if (paginas.length === 0)
    return { ok: false, motivo: 'Não achei nenhuma Página conectada à sua conta. Conecte uma Página no Meta.' }
  if (paginas.length === 1) return { ok: true, pagina: paginas[0] }
  const q = (query ?? '').trim().toLowerCase()
  if (!q) return { ok: false, motivo: `Você tem ${paginas.length} páginas: ${paginas.map((p) => `"${p.name}" [${p.id}]`).join(', ')}. Me diga qual usar (nome ou id).` }
  const pagina = paginas.find((p) => p.id === query) ?? paginas.find((p) => p.name.toLowerCase().includes(q))
  if (!pagina) return { ok: false, motivo: `Não achei a Página "${query}". Opções: ${paginas.map((p) => `"${p.name}"`).join(', ')}.` }
  return { ok: true, pagina }
}
