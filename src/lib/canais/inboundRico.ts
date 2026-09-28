






const CAP_TEXTO = 4000

export interface InboundEstruturado {
  
  texto: string
  
  dados: Record<string, unknown>
}

const obj = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

const corta = (s: string): string => (s.length > CAP_TEXTO ? s.slice(0, CAP_TEXTO) : s)
const feito = (texto: string, dados: Record<string, unknown>): InboundEstruturado => ({ texto: corta(texto), dados })

export function interpretarInteractive(m: unknown): InboundEstruturado | null {
  const i = obj(obj(m)?.interactive)
  if (!i) return null
  const tipo = str(i.type)

  if (tipo === 'button_reply') {
    const b = obj(i.button_reply)
    const titulo = str(b?.title)
    if (!titulo) return null
    return feito(`[cliente clicou no botão "${titulo}"]`, { tipo, id: str(b?.id), titulo })
  }
  if (tipo === 'list_reply') {
    const l = obj(i.list_reply)
    const titulo = str(l?.title)
    if (!titulo) return null
    const desc = str(l?.description)
    return feito(
      `[cliente escolheu "${titulo}"${desc ? ` (${desc})` : ''} na lista]`,
      { tipo, id: str(l?.id), titulo, ...(desc ? { descricao: desc } : {}) },
    )
  }
  if (tipo === 'nfm_reply') {
    const n = obj(i.nfm_reply)
    if (!n) return null
    let resposta: unknown = null
    try { resposta = JSON.parse(str(n.response_json)) } catch {  }
    const nome = str(n.name)
    return feito(
      `[cliente respondeu ao formulário${nome ? ` "${nome}"` : ''}: ${resposta ? JSON.stringify(resposta) : 'resposta ilegível'}]`,
      { tipo, ...(nome ? { nome } : {}), ...(resposta ? { resposta } : {}) },
    )
  }
  return null
}


export function interpretarButton(m: unknown): InboundEstruturado | null {
  const b = obj(obj(m)?.button)
  const texto = str(b?.text)
  if (!texto) return null
  return feito(`[cliente clicou no botão "${texto}"]`, { tipo: 'button', titulo: texto, payload: str(b?.payload) })
}

export function interpretarLocation(m: unknown): InboundEstruturado | null {
  const l = obj(obj(m)?.location)
  const lat = num(l?.latitude)
  const lon = num(l?.longitude)
  if (lat === null || lon === null) return null   
  const nome = str(l?.name)
  const endereco = str(l?.address)
  const rotulo = [nome, endereco].filter(Boolean).join(' — ')
  return feito(
    `[cliente enviou a localização${rotulo ? `: ${rotulo}` : ''} (${lat}, ${lon})]`,
    { latitude: lat, longitude: lon, ...(nome ? { nome } : {}), ...(endereco ? { endereco } : {}) },
  )
}

export function interpretarContacts(m: unknown): InboundEstruturado | null {
  const bruto = obj(m)?.contacts
  if (!Array.isArray(bruto) || bruto.length === 0) return null
  const contatos = bruto.map((c) => {
    const cc = obj(c)
    const nome = str(obj(cc?.name)?.formatted_name)
    const fones = Array.isArray(cc?.phones) ? cc.phones : []
    const telefone = str(obj(fones[0])?.phone)
    return { nome, telefone }
  }).filter((c) => c.nome || c.telefone)
  if (contatos.length === 0) return null
  const lista = contatos.map((c) => `${c.nome}${c.telefone ? ` (${c.telefone})` : ''}`).join('; ')
  return feito(`[cliente compartilhou ${contatos.length === 1 ? 'o contato' : 'os contatos'}: ${lista}]`, { contatos })
}

export function interpretarOrder(m: unknown): InboundEstruturado | null {
  const o = obj(obj(m)?.order)
  const bruto = o?.product_items
  if (!Array.isArray(bruto) || bruto.length === 0) return null
  const itens = bruto.map((p) => {
    const pp = obj(p)
    return {
      sku: str(pp?.product_retailer_id),
      quantidade: num(pp?.quantity) ?? 1,
      preco: num(pp?.item_price),
      moeda: str(pp?.currency),
    }
  })
  const lista = itens.map((i) => `${i.quantidade}x ${i.sku}`).join(', ')
  return feito(
    `[cliente montou um pedido no carrinho com ${itens.length} ${itens.length === 1 ? 'item' : 'itens'}: ${lista}]`,
    { catalogo: str(o?.catalog_id), itens },
  )
}

export function interpretarReaction(m: unknown): InboundEstruturado | null {
  const r = obj(obj(m)?.reaction)
  const alvo = str(r?.message_id)
  if (!alvo) return null
  const emoji = str(r?.emoji)
  if (!emoji) {
    return feito('[cliente removeu a reação de uma mensagem sua]', { alvoExternalId: alvo, removida: true, emoji: '' })
  }
  return feito(`[cliente reagiu ${emoji} a uma mensagem sua]`, { alvoExternalId: alvo, emoji, removida: false })
}


export function descreverInbound(tipo: string, mensagem: Record<string, unknown>): InboundEstruturado | null {
  switch (tipo) {
    case 'interactive': return interpretarInteractive(mensagem)
    case 'button': return interpretarButton(mensagem)
    case 'location': return interpretarLocation(mensagem)
    case 'contacts': return interpretarContacts(mensagem)
    case 'order': return interpretarOrder(mensagem)
    case 'reaction': return interpretarReaction(mensagem)
    default: return null
  }
}
