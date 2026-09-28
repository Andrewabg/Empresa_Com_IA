
import { z } from 'zod'
import { recordCost as recordCostImpl } from '@/data/cost'
import { generateBackgroundObject, type BgGenResult } from '@/server/cost/backgroundLLM'
import { BACKGROUND_MAX_OUTPUT } from '@/lib/llm-tuning'
import { withTimeout } from '@/lib/withTimeout'
import type { Profundidade } from '@/lib/onboarding/types'


const ExtracaoSchema = z.object({
  valor: z.string().nullable(),
  profundidade: z.number(),
})


export interface ExtracaoSlot {
  valor: string | null
  profundidade: Profundidade
}

const NADA: ExtracaoSlot = { valor: null, profundidade: 0 }


const TIMEOUT_MS = 6_000


function faixaProfundidade(n: unknown): Profundidade {
  const bruto = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : 0
  return Math.min(3, Math.max(0, bruto)) as Profundidade
}


export function buildExtracaoPrompt(pergunta: string, resposta: string): string {
  return [
    'Você extrai UM fato de negócio da fala do dono, para preencher um campo de cadastro.',
    '',
    `PERGUNTA que foi feita a ele: "${pergunta}"`,
    `RESPOSTA dele: "${resposta}"`,
    '',
    'Devolva:',
    '- `valor`: o fato pedido, em UMA frase curta na 3ª pessoa (ex.: "Gestão de tráfego pago para',
    '  clínicas de estética"). Use APENAS o que ele disse — não complete, não suponha, não',
    '  generalize. Se a resposta NÃO contém o fato pedido (ele mudou de assunto, fez outra',
    '  pergunta, disse "depois eu vejo", só cumprimentou ou pediu explicação), devolva null.',
    '- `profundidade`: 0 = nada; 1 = vago/genérico; 2 = concreto; 3 = concreto COM detalhe',
    '  específico (número, nicho, exemplo real).',
  ].join('\n')
}

export interface ExtrairRespostaSlotDeps {
  generate?: (args: { prompt: string }) => Promise<BgGenResult>
  recordCost?: typeof recordCostImpl
}


export async function extrairRespostaSlot(
  args: { pergunta: string; resposta: string },
  deps: ExtrairRespostaSlotDeps = {},
): Promise<ExtracaoSlot> {
  try {
    const resposta = (args.resposta ?? '').trim()
    if (!resposta) return NADA
    const generate =
      deps.generate ??
      ((a: { prompt: string }) =>
        generateBackgroundObject({
          schema: ExtracaoSchema,
          prompt: a.prompt,
          maxOutputTokens: BACKGROUND_MAX_OUTPUT,
        }))
    const recordCost = deps.recordCost ?? recordCostImpl

    const raw = await withTimeout(
      generate({ prompt: buildExtracaoPrompt(args.pergunta, resposta) }),
      TIMEOUT_MS,
      'extrairRespostaSlot',
    )
    try {
      await recordCost({
        kind: 'chat',
        model: raw.model,
        promptTokens: raw.usage.inputTokens ?? 0,
        completionTokens: raw.usage.outputTokens ?? 0,
        cachedTokens: raw.usage.cachedInputTokens ?? 0,
        agent: 'jarvis',
        tool: 'extrairRespostaSlot',
      })
    } catch {
      
    }

    const parsed = ExtracaoSchema.safeParse(raw.object)
    if (!parsed.success) {
      console.warn('[extrairRespostaSlot] resposta fora do schema (nada capturado):', raw.object)
      return NADA
    }
    const valor = (parsed.data.valor ?? '').trim()
    
    if (!valor) return NADA
    return { valor, profundidade: faixaProfundidade(parsed.data.profundidade) }
  } catch (e) {
    console.warn('[extrairRespostaSlot] fail-open (nada capturado):', e)
    return NADA
  }
}
