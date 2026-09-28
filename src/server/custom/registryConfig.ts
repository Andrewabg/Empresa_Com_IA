// src/server/custom/registryConfig.ts — carrega SÓ os campos de config da zona custom/ e
// valida fail-fast. Registry POR KIND de propósito: cada módulo importa 1 arquivo do cliente
// — quebrar um não derruba os outros bundles.
import { CONFIGS } from '@custom/config'
import { validarConfigs } from './validarAutomacao'
import { ouExplode } from './valida'
import type { ConfigCustom } from './contrato'

// CONFIGS é const de módulo (imutável em runtime) → valida 1×; erro não cacheia
// (cada superfície escolhe seu fail-open: 503 / página de erro / chat fail-open).
let cache: ConfigCustom[] | null = null

export function getCustomConfigs(): ConfigCustom[] {
  if (cache) return cache
  const validated = ouExplode(CONFIGS, validarConfigs(CONFIGS), 'custom/config/index.ts')
  cache = validated
  return validated
}
