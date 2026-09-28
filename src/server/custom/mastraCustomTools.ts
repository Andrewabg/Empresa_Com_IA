// src/server/custom/mastraCustomTools.ts — embrulha ToolCustom (contrato do cliente)
// em Tool do Mastra. Execução SEMPRE fail-open (erro do código do cliente nunca
// derruba o turno) e com trilho HITL quando requerAprovacao.
import { createTool } from '@mastra/core/tools'
import type { z } from 'zod'
import { getCustomTools } from './registryTools'
import { getTurnContext } from '@/server/agent/turnContext'
import { construirCtxCustom } from './contextoCustom'
import { createCustomToolApproval } from '@/server/approvals/customTool'

/**
 * O MESMO catálogo, mas A SECO: as tools existem para o modelo (mesmo id, mesma descrição,
 * mesmo schema) e o código do CLIENTE não roda. É o que o simulador e o replay da Sala de
 * Treino precisam: sem isto, testar o atendente ali gravaria de verdade na tabela do
 * comprador e criaria aprovação de verdade — espelha o `makeExecuteFnDry` do Composio.
 *
 * `aoChamar` recebe a intenção capturada (o simulador a mostra como chip).
 */
export function makeCustomMastraToolsSecas(
  enabledIds: string[],
  aoChamar?: (id: string, args: Record<string, unknown>, requerAprovacao: boolean) => void,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const byId = new Map(getCustomTools().map((t) => [t.id, t]))
  for (const id of enabledIds) {
    const def = byId.get(id)
    if (!def) continue
    out[id] = createTool({
      id: def.id,
      description: def.descricao,
      inputSchema: def.inputSchema as z.ZodTypeAny,
      execute: async (input: unknown) => {
        aoChamar?.(def.id, (input ?? {}) as Record<string, unknown>, !!def.requerAprovacao)
        return { ok: true, simulado: true, message: `Feito. (simulado, "${def.titulo}" não rodou de verdade)` }
      },
    })
  }
  return out
}

/** Monta o Record de tools Mastra pros ids HABILITADOS no agente. Id órfão (habilitado
 *  mas removido do registro) é IGNORADO em silêncio — nunca derruba o chat (spec §4.1).
 *
 *  `agentePadrao` é para quem monta o agente FORA de um turno com contexto: o atendente
 *  de canal roda sem `runWithTurnContext`, e sem isso a aprovação criada por uma tool
 *  dele nasceria sem dono, aparecendo no painel sem dizer quem pediu. */
export function makeCustomMastraTools(
  enabledIds: string[],
  agentePadrao?: string | null,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const byId = new Map(getCustomTools().map((t) => [t.id, t]))
  for (const id of enabledIds) {
    const def = byId.get(id)
    if (!def) continue // órfã: some do toggle na próxima edição
    out[id] = createTool({
      id: def.id,
      description: def.descricao,
      inputSchema: def.inputSchema as z.ZodTypeAny,
      // Mastra passa o input PARSEADO como primeiro argumento posicional.
      execute: async (input: unknown) => {
        try {
          const turn = getTurnContext()
          const agentId = turn.actingAgentId ?? agentePadrao ?? null
          // A conversa do turno, venha ela da sala do painel ou do atendimento. O contrato
          // da zona custom/ tem UM campo ("em que conversa estou"), e é por ele que a tool
          // do comprador descobre com quem se está falando — o número do cliente não pode
          // vir do modelo, que preencheria um plausível.
          const conversaDoTurno = turn.conversationId ?? turn.conversaExternaId ?? null
          if (def.requerAprovacao) {
            // A aprovação nasce com o AGENTE e a CONVERSA do turno: o approve executa com o
            // MESMO ctx que a execução direta teria. Sem a conversa, uma tool que descobre o
            // cliente por ela funcionava direto e falhava para sempre quando passava pela fila.
            // Cada conversa na SUA coluna — `conversation_id` tem chave estrangeira para a
            // sala do painel e recusaria um id do atendimento.
            await createCustomToolApproval({
              toolId: def.id, titulo: def.titulo, args: input, agentId,
              conversationId: turn.conversationId ?? null,
              conversaExternaId: turn.conversaExternaId ?? null,
            })
            return { ok: true, aguardandoAprovacao: true, message: `"${def.titulo}" precisa da aprovação do dono — criei o pedido em /aprovacoes. NÃO diga que já executou.` }
          }
          const ctx = construirCtxCustom({
            agentId,
            operatorId: turn.operatorId ?? null,
            conversationId: conversaDoTurno,
          })
          return await def.execute(ctx, input)
        } catch (err) {
          console.warn(`[toolCustom ${def.id}] falhou:`, err)
          return { ok: false, message: `A tool custom "${def.titulo}" falhou agora — avise o operador e siga sem ela.` }
        }
      },
    })
  }
  return out
}
