// src/server/custom/registryWebhooks.ts — carrega SÓ os webhooks da zona custom/ e valida
// fail-fast. Registry POR KIND de propósito: cada módulo importa 1 arquivo do cliente
// — quebrar um não derruba os outros bundles.
import { WEBHOOKS } from '@custom/webhooks'
import { validarWebhooks } from './validarAutomacao'
import { ouExplode } from './valida'
import type { WebhookCustom } from './contrato'

// WEBHOOKS é const de módulo (imutável em runtime) → valida 1×; erro não cacheia
// (cada superfície escolhe seu fail-open: 503 / página de erro / chat fail-open).
let cache: WebhookCustom[] | null = null

export function getCustomWebhooks(): WebhookCustom[] {
  if (cache) return cache
  const validated = ouExplode(WEBHOOKS, validarWebhooks(WEBHOOKS), 'custom/webhooks/index.ts')
  cache = validated
  return validated
}
