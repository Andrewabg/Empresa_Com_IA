


export interface MsgComData {
  role: string
  content: string | null
  created_at?: string | null
}


export function selecionarDelta<T extends MsgComData>(msgs: T[], reflectedAt: string | null | undefined): T[] {
  if (!reflectedAt) return msgs
  return msgs.filter((m) => {
    const ts = m.created_at
    if (!ts) return true 
    return ts > reflectedAt
  })
}


export function deveRefletir(
  usableCount: number,
  operatorChars: number,
  minMsgs: number,
  minChars: number,
): boolean {
  return usableCount >= minMsgs || operatorChars >= minChars
}


export function contarCharsOperador(msgs: MsgComData[]): number {
  let n = 0
  for (const m of msgs) if (m.role === 'user' && m.content) n += m.content.length
  return n
}


export const REFLECT_MIN_MSGS = 3
export const REFLECT_MIN_CHARS = 240


export function emCooldown(
  reflectedAt: string | null | undefined,
  nowIso: string,
  cooldownMs: number,
): boolean {
  if (!reflectedAt) return false
  const reflectedMs = Date.parse(reflectedAt)
  const nowMs = Date.parse(nowIso)
  if (Number.isNaN(reflectedMs) || Number.isNaN(nowMs)) return false
  return nowMs - reflectedMs < cooldownMs
}


export const REFLECT_COOLDOWN_MS = 6 * 60 * 60 * 1000


export function elegivelParaReflexao(
  reflectedAt: string | null | undefined,
  updatedAt: string,
  nowIso: string,
  cooldownMs: number,
): boolean {
  if (!reflectedAt) return true
  if (reflectedAt >= updatedAt) return false
  return !emCooldown(reflectedAt, nowIso, cooldownMs)
}


const GATILHOS_FATO = new Set([
  'cnpj', 'cpf', 'comissao', 'ticket', 'preco', 'valor', 'prazo',
  'telefone', 'email', 'e-mail', 'endereco', 'pix', 'conta',
  'meta', 'publico', 'nicho', 'persona', 'orcamento', 'proposta',
  'clausula', 'honorario', 'fatura', 'contrato', 'roas', 'cpl', 'cac',
])


function semAcentoReflect(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}


export function temGatilhoDeFato(texto: string): boolean {
  const tokens = semAcentoReflect(texto.toLowerCase()).split(/[^a-z0-9-]+/).filter(Boolean)
  for (const tok of tokens) {
    if (GATILHOS_FATO.has(tok)) return true
  }
  return false
}


export function montarTranscrito(
  mensagens: { role: string; content: string | null }[],
  rotuloDoAgente = 'Assistente',
): string {
  return mensagens
    .map((m) => {
      
      
      // eslint-disable-next-line no-control-regex
      const texto = (m.content ?? '').replace(/[\s\u0000-\u001F\u007F]+/g, ' ').trim()
      return `${m.role === 'user' ? 'Operador' : rotuloDoAgente}: ${texto}`
    })
    .join('\n')
}
