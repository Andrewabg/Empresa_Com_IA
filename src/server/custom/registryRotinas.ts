// src/server/custom/registryRotinas.ts — carrega SÓ as rotinas periódicas da zona custom/ e
// valida fail-fast. Registry POR KIND de propósito: cada módulo importa 1 arquivo do cliente
// — quebrar um não derruba os outros bundles.
import { ROTINAS } from '@custom/rotinas'
import { validarRotinas } from './validarAutomacao'
import { ouExplode } from './valida'
import type { RotinaCustom } from './contrato'

// ROTINAS é const de módulo (imutável em runtime) → valida 1×; erro não cacheia
// (cada superfície escolhe seu fail-open: 503 / página de erro / chat fail-open).
let cache: RotinaCustom[] | null = null

export function getCustomRotinas(): RotinaCustom[] {
  if (cache) return cache
  const validated = ouExplode(ROTINAS, validarRotinas(ROTINAS), 'custom/rotinas/index.ts')
  cache = validated
  return validated
}
