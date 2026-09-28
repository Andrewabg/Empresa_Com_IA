


import { Agent } from '@mastra/core/agent'
import type { ToolsInput } from '@mastra/core/agent'
import { createOpenAI } from '@ai-sdk/openai'
import type { AgentRow } from '@/data/agents'
import type { Diretriz } from '@/lib/directives'
import { canalPersona } from './persona'
import { personaWithIdentity } from '@/lib/agent-identity'
import { buildCanalTools, type CanalToolsCtx, type CanalToolsDeps } from './loadout'
import { makeCustomMastraTools, makeCustomMastraToolsSecas } from '@/server/custom/mastraCustomTools'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.5'


export function modeloDoCanal(row: { model?: string | null }): string {
  return row.model ?? MODEL
}

export function buildCanalAgent(input: {
  row: AgentRow; apiKey: string; diretrizes: Diretriz[]; fichaTexto: string; personaBlock?: string
  ctx: CanalToolsCtx; toolDeps: CanalToolsDeps
  
  composioTools?: Record<string, unknown>
  
  aSeco?: boolean
  
  capturarSeco?: (id: string, args: Record<string, unknown>, requerAprovacao: boolean) => void
}): Agent {
  const openai = createOpenAI({ apiKey: input.apiKey })
  
  
  
  
  
  
  let customTools: Record<string, unknown> = {}
  const idsCustom = input.row.tools?.custom_tools ?? []
  if (idsCustom.length > 0) {
    try {
      customTools = input.aSeco
        ? makeCustomMastraToolsSecas(idsCustom, input.capturarSeco)
        : makeCustomMastraTools(idsCustom, input.row.id)
    } catch (err) {
      console.warn('[buildCanalAgent] registro custom inválido, tools custom ignoradas:', err)
    }
  }
  
  
  const temAcoes =
    Object.keys(input.composioTools ?? {}).length > 0 || Object.keys(customTools).length > 0
  
  
  const temArquivos = Boolean(input.toolDeps.listarMidiaPublica && input.toolDeps.enviarArquivo)
  const temOpcoes = Boolean(input.toolDeps.oferecerOpcoes)
  return new Agent({
    id: `canal-${input.row.id}`,
    name: input.row.name,
    
    
    
    
    
    
    instructions: personaWithIdentity(
      canalPersona({ systemPrompt: input.row.system_prompt, diretrizes: input.diretrizes, fichaTexto: input.fichaTexto, personaBlock: input.personaBlock, temAcoes, temArquivos, temOpcoes }),
      input.row.name,
      input.row.system_prompt,
    ),
    model: openai(modeloDoCanal(input.row)),
    
    
    tools: buildCanalTools(input.ctx, input.toolDeps, input.composioTools, customTools) as ToolsInput,
  })
}
