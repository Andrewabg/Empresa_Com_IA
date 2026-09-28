// src/server/custom/registryTools.ts — carrega SÓ as tools da zona custom/ e valida
// fail-fast. Registry POR KIND de propósito: cada módulo importa 1 arquivo do cliente
// — quebrar um (ex.: o .tsx de pages) não derruba os outros bundles (ex.: o chat, que
// só puxa tools, nunca pode arrastar React de custom/pages transitivamente).
import { z } from 'zod'
import { TOOLS } from '@custom/tools'
import { validarToolsCustom } from '@/lib/custom-registry-validate'
import { ouExplode } from './valida'
import type { ToolCustom } from './contrato'

// TOOLS é const de módulo (imutável em runtime) → valida 1×; erro não cacheia
// (cada superfície escolhe seu fail-open: 503 / página de erro / chat fail-open).
let cache: ToolCustom[] | null = null

export function getCustomTools(): ToolCustom[] {
  if (cache) return cache
  const erros = validarToolsCustom(TOOLS)
  // OpenAI function-calling exige schema OBJETO — falhar cedo com mensagem clara.
  for (const tool of TOOLS) {
    if (!(tool.inputSchema instanceof z.ZodObject)) {
      erros.push(`tool custom "${tool.id}": inputSchema precisa ser z.object({...})`)
    }
  }
  const validated = ouExplode(TOOLS, erros, 'custom/tools/index.ts')
  cache = validated
  return validated
}
