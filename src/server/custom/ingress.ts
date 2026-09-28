// src/server/custom/ingress.ts — orquestração do ingress público de webhooks da zona custom/
// (/api/hooks/<slug>). PURO/testável: as dependências de I/O (registry, Vault, fila, rate-limit)
// são INJETADAS. A rota (route.ts) monta as deps reais e fica fina.
//
// Fluxo (ACK-then-queue): rate-limit → resolve webhook → lê segredo → SAFELIST de headers →
// verifica assinatura → parse best-effort → enfileira (dedup estrutural). Nunca chama
// `processar` aqui (isso é trabalho do heartbeat, fora do caminho de request).
//
// SEGURANÇA: só a SAFELIST de headers vaza pra a fila/observabilidade — NUNCA authorization
// nem cookie. Assinatura inválida NÃO enfileira (só registra rejeitado). A verificação mora
// no core (verificarAssinatura), o cliente só declara o descriptor.
import { verificarAssinatura } from './verificarAssinatura'
import { resolverDedup } from './resolverDedup'
import { getCustomWebhooks } from './registryWebhooks'
import { getSecretCustom } from './segredos'
import { enfileirar as enfileirarReal, registrarRejeitado as registrarRejeitadoReal } from '@/data/webhookEvents'
import { webhookRateLimiter } from '@/server/http/rateLimit'
import type { WebhookCustom, WebhookEvent } from './contrato'

/** Entrada normalizada pela rota (raw cru + maps lowercase). */
export interface EntradaIngress {
  slug: string
  raw: string
  headers: Record<string, string>
  query: Record<string, string>
  /** Chave de rate-limit já montada pela rota (ex.: `ip:slug`). Ausente ⇒ usa o slug. */
  chaveRate?: string
}

/** Dependências injetadas — a rota passa as reais; o teste passa mocks. */
export interface IngressDeps {
  getWebhook: (slug: string) => WebhookCustom | null
  getSecret: (nome: string) => Promise<string | null>
  enfileirar: (input: {
    slug: string
    dedupKey?: string
    payload: Record<string, unknown>
    headers?: Record<string, unknown>
  }) => Promise<{ created: boolean }>
  registrarRejeitado: (input: {
    slug: string
    headers?: Record<string, unknown>
    erro: string
  }) => Promise<void>
  permitir: (chave: string) => boolean
}

/**
 * SAFELIST de headers: só o que é seguro persistir na fila/observabilidade.
 *   - o header de assinatura declarado (quando `em:'header'`);
 *   - content-type (útil pro processar entender o corpo);
 *   - um id de entrega (x-request-id / x-delivery-id) quando presente.
 * NUNCA authorization/cookie (segredo/sessão). Chaves comparadas em lowercase.
 */
function safelistHeaders(
  headers: Record<string, string>,
  webhook: WebhookCustom,
): Record<string, string> {
  const permitidos = new Set<string>(['content-type', 'x-request-id', 'x-delivery-id'])
  if (webhook.auth.em === 'header') permitidos.add(webhook.auth.header.toLowerCase())

  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) {
    if (permitidos.has(k.toLowerCase())) out[k] = v
  }
  return out
}

/** O que o dono lê na lista de eventos quando o cofre não respondeu. */
export const ERRO_COFRE_FORA =
  'Não consegui ler o segredo deste webhook agora. Nada foi aceito; peça o reenvio em alguns minutos.'

/** O que o dono lê quando o segredo nunca foi preenchido (a causa que parecia assinatura errada). */
export function erroSegredoAusente(nome: string): string {
  return `O segredo "${nome}" ainda não foi preenchido em Configuração, então todo envio para este endereço é recusado.`
}

/** Registrar é observabilidade: se ela falhar, o desfecho do webhook não muda. */
async function registrarSeguro(
  deps: IngressDeps,
  input: { slug: string; headers?: Record<string, unknown>; erro: string },
): Promise<void> {
  try {
    await deps.registrarRejeitado(input)
  } catch (err) {
    console.warn(`[ingress ${input.slug}] registrar rejeitado falhou (não-fatal):`, err)
  }
}

/**
 * Orquestra um ingress de webhook custom. Devolve só `{ status }` — a rota o embrulha
 * numa Response JSON. Toda decisão passa por deps injetadas (puro/testável).
 */
export async function processarIngressWebhook(
  entrada: EntradaIngress,
  deps: IngressDeps,
): Promise<{ status: number }> {
  // 1) Rate-limit ANTES de qualquer trabalho (a chave já vem montada pela rota).
  const chave = entrada.chaveRate ?? entrada.slug
  if (!deps.permitir(chave)) return { status: 429 }

  // 2) Resolve o webhook do slug (desconhecido → 404).
  const webhook = deps.getWebhook(entrada.slug)
  if (!webhook) return { status: 404 }

  // 3) SAFELIST de headers — só isso vaza pra fila/observabilidade. Sobe ANTES do segredo
  // porque as duas falhas de segredo abaixo também precisam registrar o evento.
  const headersSeguro = safelistHeaders(entrada.headers, webhook)

  // 4) Segredo do Vault (pelo nome declarado no descriptor).
  //
  // Os DOIS tropeços daqui viravam a MESMA linha no painel, "assinatura inválida", e
  // mandavam o dono conferir a assinatura do remetente quando o problema era outro: o
  // cofre fora do ar (erro transitório, o remetente deve reenviar) e o segredo que ele
  // ainda não preencheu na Configuração. Cada um agora se explica com o próprio nome.
  let segredo: string | null
  try {
    segredo = await deps.getSecret(webhook.auth.segredo)
  } catch (err) {
    console.warn(`[ingress ${entrada.slug}] leitura do segredo falhou:`, err)
    await registrarSeguro(deps, { slug: entrada.slug, headers: headersSeguro, erro: ERRO_COFRE_FORA })
    // 503 e não 500: é transitório, e todo remetente sério reenvia num 503.
    return { status: 503 }
  }
  if (!segredo) {
    await registrarSeguro(deps, {
      slug: entrada.slug,
      headers: headersSeguro,
      erro: erroSegredoAusente(webhook.auth.segredo),
    })
    return { status: 401 }
  }

  // 5) Verifica a assinatura. Inválida → registra rejeitado (observabilidade) e 401. NÃO enfileira.
  const valido = verificarAssinatura({
    raw: entrada.raw,
    headers: entrada.headers,
    query: entrada.query,
    descriptor: webhook.auth,
    valorSegredo: segredo,
  })
  if (!valido) {
    await deps.registrarRejeitado({ slug: entrada.slug, headers: headersSeguro, erro: 'assinatura inválida' })
    return { status: 401 }
  }

  // 6) Parse JSON best-effort — o corpo cru já viaja em `raw`.
  let body: unknown = null
  try {
    body = JSON.parse(entrada.raw)
  } catch {
    body = null
  }

  // 7) Monta o evento e resolve a chave de dedup.
  const evento: WebhookEvent = { slug: entrada.slug, body, headers: headersSeguro, raw: entrada.raw }
  const dedupKey = resolverDedup(webhook, evento)

  // 8) Enfileira (ACK-then-queue). created:false (dedup) TAMBÉM é 200 — não é erro.
  await deps.enfileirar({
    slug: entrada.slug,
    dedupKey: dedupKey ?? undefined,
    payload: (body ?? {}) as Record<string, unknown>,
    headers: headersSeguro,
  })
  return { status: 200 }
}

/** Monta as deps REAIS (registry + Vault + fila + rate-limit singleton) pra a rota fina. */
export function ingressDepsReais(): IngressDeps {
  return {
    getWebhook: (slug) => getCustomWebhooks().find((w) => w.slug === slug) ?? null,
    getSecret: (nome) => getSecretCustom(nome),
    enfileirar: (input) => enfileirarReal(input),
    registrarRejeitado: (input) => registrarRejeitadoReal(input),
    permitir: (chave) => webhookRateLimiter.permitir(chave),
  }
}
