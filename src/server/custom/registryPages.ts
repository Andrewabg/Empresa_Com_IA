// src/server/custom/registryPages.ts — carrega SÓ as páginas da zona custom/ e valida
// fail-fast. Registry POR KIND de propósito: este é o ÚNICO módulo que importa o .tsx
// do cliente (React) — quebrar/pesar as pages não derruba os bundles de tools/apis.
import { PAGINAS } from '@custom/pages'
import { validarSlugsCustom } from '@/lib/custom-registry-validate'
import { ouExplode } from './valida'
import type { PaginaCustom } from './contrato'

// PAGINAS é const de módulo (imutável em runtime) → valida 1×; erro não cacheia
// (cada superfície escolhe seu fail-open: 503 / página de erro / chat fail-open).
let cache: PaginaCustom[] | null = null

export function getCustomPages(): PaginaCustom[] {
  if (cache) return cache
  const validated = ouExplode(PAGINAS, validarSlugsCustom(PAGINAS, 'página'), 'custom/pages/index.tsx')
  cache = validated
  return validated
}
