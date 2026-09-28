


import { linkValido, normalizarCta } from '@/lib/trafego/lancamentoCriativo'
import type { Approval } from '@/data/approvals'

const SLUG_LANCAMENTO = 'AWAVE_META_LAUNCH_CREATIVE'


export interface LaunchFields {
  message?: string
  headline?: string
  cta?: string
  link?: string
}

export interface PatchLaunchDeps {
  getApproval: (id: string) => Promise<Approval | null>
  updateApprovalArgs: (id: string, action_args: Record<string, unknown>) => Promise<Approval>
}

export interface PatchResult {
  status: number
  body: { ok?: true; error?: string }
}


export async function patchLaunchArgs(
  id: string,
  fields: LaunchFields,
  deps: PatchLaunchDeps,
): Promise<PatchResult> {
  let approval: Approval | null
  try {
    approval = await deps.getApproval(id)
  } catch (e) {
    
    console.error('[patchLaunchArgs] getApproval falhou', e)
    return { status: 500, body: { error: 'Não foi possível carregar a aprovação. Tente de novo.' } }
  }
  if (!approval || approval.status !== 'pending') {
    return { status: 404, body: { error: 'not found' } }
  }
  if (approval.action_slug !== SLUG_LANCAMENTO) {
    return { status: 400, body: { error: 'kind not editable' } }
  }

  
  if (fields.link !== undefined && !linkValido(fields.link)) {
    return { status: 400, body: { error: 'Link de destino inválido (use http/https).' } }
  }
  if (fields.message !== undefined && !fields.message.trim()) {
    return { status: 400, body: { error: 'A mensagem não pode ficar vazia.' } }
  }
  if (fields.headline !== undefined && !fields.headline.trim()) {
    return { status: 400, body: { error: 'A headline não pode ficar vazia.' } }
  }

  
  const atual = (approval.action_args ?? {}) as Record<string, unknown>
  const merged: Record<string, unknown> = { ...atual }
  if (fields.message !== undefined) merged.message = fields.message.trim()
  if (fields.headline !== undefined) merged.headline = fields.headline.trim()
  if (fields.cta !== undefined) merged.cta = normalizarCta(fields.cta)
  if (fields.link !== undefined) merged.link = fields.link.trim()

  try {
    await deps.updateApprovalArgs(id, merged)
    return { status: 200, body: { ok: true } }
  } catch (e) {
    console.error('[patchLaunchArgs] update falhou', e)
    return { status: 500, body: { error: 'Não foi possível salvar. Tente de novo.' } }
  }
}
