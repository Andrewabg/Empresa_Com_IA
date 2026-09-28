// src/server/custom/registryApis.ts — carrega SÓ os endpoints da zona custom/ e valida
// fail-fast. Registry POR KIND de propósito: cada módulo importa 1 arquivo do cliente
// — quebrar um não derruba os outros bundles.
import { APIS } from '@custom/api'
import { validarSlugsCustom } from '@/lib/custom-registry-validate'
import { ouExplode } from './valida'
import type { ApiCustom } from './contrato'

// APIS é const de módulo (imutável em runtime) → valida 1×; erro não cacheia
// (cada superfície escolhe seu fail-open: 503 / página de erro / chat fail-open).
let cache: ApiCustom[] | null = null

export function getCustomApis(): ApiCustom[] {
  if (cache) return cache
  const validated = ouExplode(APIS, validarSlugsCustom(APIS, 'api'), 'custom/api/index.ts')
  cache = validated
  return validated
}
