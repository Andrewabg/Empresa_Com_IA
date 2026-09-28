
import { getAgent as getAgentImpl } from './jarvis'
import { getAgentRow as getAgentRowImpl } from '@/data/agents'
import { assembleAgentContext, type AgentContextParts } from '@/server/memory/agentContext'
import { getTurnContext } from './turnContext'
import { motivoSeguro } from '@/lib/sanitizarErro'




const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'

export interface ConsultarInput { agentId: string; pergunta: string }
export interface ConsultarUsage { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number }
export interface ConsultarResult {
  ok: boolean
  resposta?: string
  nome?: string
  message?: string
  usage?: ConsultarUsage
  model?: string | null
}

interface Deps {
  getAgent?: (id: string) => Promise<{ generate: (m: unknown) => Promise<{ text?: string; usage?: ConsultarUsage }> }>
  getAgentRow?: (id: string) => Promise<{ id: string; name: string; enabled: boolean; model?: string | null } | null>
  
  assembleContext?: (agentId: string, prompt: string) => Promise<AgentContextParts>
}


export async function consultarFuncionario(input: ConsultarInput, deps: Deps = {}): Promise<ConsultarResult> {
  const getAgentRow = deps.getAgentRow ?? getAgentRowImpl
  const getAgent: NonNullable<Deps['getAgent']> =
    deps.getAgent ?? (getAgentImpl as unknown as NonNullable<Deps['getAgent']>)
  const row = await getAgentRow(input.agentId)
  if (!row || !row.enabled) return { ok: false, message: `Não consegui falar com o agente "${input.agentId}" (inexistente ou desabilitado).` }
  try {
    const agent = await getAgent(input.agentId)
    
    
    
    
    
    const assembleContext =
      deps.assembleContext ??
      ((agentId: string, prompt: string) =>
        assembleAgentContext(agentId, prompt, { operatorId: getTurnContext().operatorId }))
    const { stable, recall } = await assembleContext(input.agentId, input.pergunta)
    const messages: Array<{ role: 'system' | 'user'; content: string }> = []
    if (stable) messages.push({ role: 'system', content: stable })
    messages.push({ role: 'user', content: recall ? `${input.pergunta}\n\n${recall}` : input.pergunta })
    const out = await agent.generate(messages)
    
    return { ok: true, resposta: out.text ?? '', nome: row.name, usage: out.usage, model: row.model ?? DEFAULT_MODEL }
  } catch (e) {
    
    
    
    return { ok: false, message: `Falha ao consultar ${row.name}: ${motivoSeguro(e)}` }
  }
}
