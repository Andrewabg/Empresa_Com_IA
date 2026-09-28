
import { isArtifactKind, type ArtifactKind } from '../../lib/artifacts'
import { createArtifact as createArtifactDefault, type ArtifactRow, type CreateArtifactInput } from '../../data/artifacts'

export interface EmitirArtefatoInput {
  kind: ArtifactKind
  título: string
  conteúdo: string
}
export interface EmitirArtefatoCtx {
  conversationId?: string | null
  taskId?: string | null
  agentId: string
}
export interface EmitirArtefatoResult {
  output: string            
  artifact: ArtifactRow | null
}
export interface EmitirArtefatoDeps {
  create?: (input: CreateArtifactInput) => Promise<ArtifactRow>
}

export async function emitirArtefato(
  input: EmitirArtefatoInput,
  ctx: EmitirArtefatoCtx,
  deps: EmitirArtefatoDeps = {},
): Promise<EmitirArtefatoResult> {
  if (!isArtifactKind(input.kind) || input.kind === 'imagem') {
    return { output: `kind inválido para emitirArtefato: "${String(input.kind)}". Use documento/html/codigo/dados (imagem é via gerarImagem).`, artifact: null }
  }
  const título = String(input.título ?? '').trim() || 'Sem título'
  const conteúdo = String(input.conteúdo ?? '')
  const create = deps.create ?? createArtifactDefault
  const artifact = await create({
    conversation_id: ctx.conversationId ?? null,
    task_id: ctx.taskId ?? null,
    agent_id: ctx.agentId,
    kind: input.kind,
    title: título,
    content: conteúdo,
  })
  return { output: `Artefato "${título}" (${input.kind}) emitido — está aberto no painel ao lado.`, artifact }
}
