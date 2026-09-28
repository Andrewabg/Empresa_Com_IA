
import { z } from 'zod'
import { recordCost as recordCostImpl } from '@/data/cost'
import { generateBackgroundObject, type BgGenResult } from '@/server/cost/backgroundLLM'
import { BACKGROUND_MAX_OUTPUT } from '@/lib/llm-tuning'
import { withTimeout } from '@/lib/withTimeout'
import type { Perfil } from '@/lib/onboarding/types'


const PerfilLLMSchema = z.object({
  perfil: z.enum(['tem_empresa', 'sem_empresa', 'revendedor', 'curioso', 'indefinido']),
})


const TIMEOUT_MS = 6_000


export function buildPerfilPrompt(texto: string): string {
  return [
    'Classifique a INTENÇÃO de quem escreveu a mensagem abaixo, em UM destes rótulos:',
    '- tem_empresa: tem um negócio próprio (inclusive agência, clínica, loja, prestador de serviço, autônomo com clientes).',
    '- sem_empresa: ainda NÃO tem empresa/negócio (quer abrir, está começando).',
    '- revendedor: quer usar ou revender a ferramenta PARA OS CLIENTES DELE (white label, revenda).',
    '- curioso: só está explorando/olhando, sem intenção declarada.',
    '- indefinido: a mensagem não dá sinal suficiente para escolher.',
    '',
    'Regras: dono de agência é tem_empresa (não revendedor) — só é revendedor com sinal',
    'explícito de revenda. ESCOLHA o rótulo que melhor encaixa, mesmo com pouca informação;',
    'use `indefinido` apenas quando a mensagem não trouxer sinal NENHUM de intenção.',
    'Responda apenas com o rótulo.',
    '',
    `Mensagem: ${texto}`,
  ].join('\n')
}

export interface ClassificarPerfilLLMDeps {
  generate?: (args: { prompt: string }) => Promise<BgGenResult>
  recordCost?: typeof recordCostImpl
}


export async function classificarPerfilLLM(
  texto: string,
  deps: ClassificarPerfilLLMDeps = {},
): Promise<Perfil | null> {
  try {
    const t = (texto ?? '').trim()
    if (!t) return null
    const generate =
      deps.generate ??
      ((args: { prompt: string }) =>
        generateBackgroundObject({
          schema: PerfilLLMSchema,
          prompt: args.prompt,
          maxOutputTokens: BACKGROUND_MAX_OUTPUT,
        }))
    const recordCost = deps.recordCost ?? recordCostImpl

    const raw = await withTimeout(generate({ prompt: buildPerfilPrompt(t) }), TIMEOUT_MS, 'classificarPerfilLLM')
    try {
      await recordCost({
        kind: 'chat',
        model: raw.model,
        promptTokens: raw.usage.inputTokens ?? 0,
        completionTokens: raw.usage.outputTokens ?? 0,
        cachedTokens: raw.usage.cachedInputTokens ?? 0,
        agent: 'jarvis',
        tool: 'classificarPerfilLLM',
      })
    } catch {
      
    }

    const parsed = PerfilLLMSchema.safeParse(raw.object)
    if (!parsed.success) {
      console.warn('[classificarPerfilLLM] resposta fora do enum (perfil indefinido):', raw.object)
      return null
    }
    return parsed.data.perfil === 'indefinido' ? null : parsed.data.perfil
  } catch (e) {
    console.warn('[classificarPerfilLLM] fail-open (perfil indefinido):', e)
    return null
  }
}
