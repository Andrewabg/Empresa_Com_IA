
import { z, ZodError } from 'zod'
import { recordCost as recordCostImpl } from '@/data/cost'
import { getMensagem as getMsgDefault } from '@/data/mensagensExternas'
import { getConversa as getConvDefault } from '@/data/conversasExternas'
import { getCanal as getCanalDefault } from '@/data/canais'
import { applyDirective as applyDefault } from '@/server/tools/registrarDiretriz'
import { agenteDaConversa } from '@/lib/canais/agenteDaConversa'
import { generateBackgroundObject, type BgGenResult } from '../cost/backgroundLLM'
import { BACKGROUND_MAX_OUTPUT } from '@/lib/llm-tuning'

const Saida = z.object({ diretrizes: z.array(z.string()).max(2) })

const PROMPT = (original: string, final: string) => `O dono da empresa EDITOU a resposta que o atendente de IA rascunhou pro cliente no WhatsApp.

RASCUNHO DO ATENDENTE:
${original}

VERSÃO FINAL DO DONO (a que foi enviada):
${final}

Extraia até 2 DIRETRIZES curtas e gerais que o atendente deve seguir SEMPRE daqui pra frente (tom, forma, conteúdo). Regras que valem pra qualquer conversa — nada específico deste cliente. Se a edição foi só cosmética/sem padrão, devolva lista vazia.`

async function defaultGenerate({ prompt }: { prompt: string }): Promise<BgGenResult> {
  return generateBackgroundObject({ schema: Saida, prompt, maxOutputTokens: BACKGROUND_MAX_OUTPUT })
}

export interface ReflectAtendimentoDeps {
  getMensagem?: typeof getMsgDefault
  getConversa?: typeof getConvDefault
  getCanal?: typeof getCanalDefault
  generate?: (args: { prompt: string }) => Promise<BgGenResult>
  recordCost?: typeof recordCostImpl
  applyDirective?: typeof applyDefault
}

export interface ReflectAtendimentoResult { reflected: boolean; error?: boolean; permanent?: boolean }

export async function reflectAtendimento(mensagemId: string, deps: ReflectAtendimentoDeps = {}): Promise<ReflectAtendimentoResult> {
  try {
    const getMensagem = deps.getMensagem ?? getMsgDefault
    const getConversa = deps.getConversa ?? getConvDefault
    const getCanal = deps.getCanal ?? getCanalDefault
    const generate = deps.generate ?? defaultGenerate
    const recordCost = deps.recordCost ?? recordCostImpl
    const applyDirective = deps.applyDirective ?? applyDefault

    const msg = await getMensagem(mensagemId)
    const original = msg?.texto_rascunho?.trim()
    const final = msg?.texto?.trim()
    if (!msg || !original || !final || original === final) return { reflected: false }

    const conversa = await getConversa(msg.conversa_id)
    const canal = conversa ? await getCanal(conversa.canal_id) : null
    if (!canal) return { reflected: false }

    
    
    const agenteId = agenteDaConversa(conversa?.agent_id, canal.agent_id)

    const raw = await generate({ prompt: PROMPT(original, final) })
    try {
      await recordCost({ kind: 'chat', model: raw.model, promptTokens: raw.usage.inputTokens ?? 0, completionTokens: raw.usage.outputTokens ?? 0, cachedTokens: raw.usage.cachedInputTokens ?? 0, agent: agenteId, tool: 'reflectAtendimento' })
    } catch {  }
    const out = Saida.parse(raw.object)
    for (const diretriz of out.diretrizes) {
      await applyDirective({ agentId: agenteId, diretriz })
    }
    return { reflected: true }
  } catch (err) {
    console.warn('[reflectAtendimento] fail-open:', err)
    return { reflected: false, error: true, permanent: err instanceof ZodError }
  }
}
