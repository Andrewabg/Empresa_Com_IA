// src/server/custom/registrySaida.ts — carrega SÓ o revisor de saída da zona custom/ e
// valida fail-fast. Registry POR KIND, como os outros: quebrar este não derruba os demais.
import { SAIDA } from '@custom/saida'
import { validarRevisorSaida } from './validarAutomacao'
import { ouExplode } from './valida'
import type { RevisorDeSaida } from './contrato'

// SAIDA é const de módulo (imutável em runtime) → valida 1×; erro não cacheia.
let cache: { valor: RevisorDeSaida | null } | null = null

export function getCustomRevisorSaida(): RevisorDeSaida | null {
  if (cache) return cache.valor
  // `ouExplode` trabalha com lista; o revisor é um só, então entra e sai como lista de 0 ou 1.
  const itens = SAIDA ? [SAIDA] : []
  ouExplode(itens, validarRevisorSaida(SAIDA), 'custom/saida/index.ts')
  cache = { valor: SAIDA ?? null }
  return cache.valor
}

/** Só para teste: zera o cache de módulo. */
export function limparCacheDoRevisor(): void { cache = null }
