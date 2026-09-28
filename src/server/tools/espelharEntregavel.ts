import { createArtifact as createArtifactImpl } from '@/data/artifacts'
import type { ArtifactKind } from '@/lib/artifacts'

export interface EspelharCtx {
  taskId?: string | null
  conversationId?: string | null
  actingAgentId?: string
}

export interface EntregavelEspelho {
  kind: ArtifactKind
  title: string
  content?: string
  storageRef?: string
}

export interface EspelharDeps {
  createArtifact?: typeof createArtifactImpl
}


export async function espelharEntregavelDaTarefa(
  ctx: EspelharCtx,
  entregavel: EntregavelEspelho,
  deps: EspelharDeps = {},
): Promise<void> {
  if (!ctx.taskId) return
  const createArtifact = deps.createArtifact ?? createArtifactImpl
  try {
    await createArtifact({
      task_id: ctx.taskId,
      conversation_id: ctx.conversationId ?? null,
      agent_id: ctx.actingAgentId ?? 'jarvis',
      kind: entregavel.kind,
      title: entregavel.title,
      content: entregavel.content ?? null,
      storage_ref: entregavel.storageRef ?? null,
    })
  } catch (e) {
    console.warn('[espelharEntregavel] fail-open:', e)
  }
}
