
import { approve, reject, type ApproveOptions, type RejectOptions } from './service'
import { OctokitGithubPR } from './github'
import { getApproval, registrarMotivoDaPendencia, type Approval } from '@/data/approvals'
import { FalhaPermanenteDaAprovacao } from '@/lib/aprovacoes/falhaPermanente'
import { getBrain, NotConfiguredError, type Brain } from '@/server/brain/runtime'
import { reconcileResilient } from '@/server/brain/reconcileResilient'
import { getComposioClient } from '@/server/actions/composio'

export interface ResolverDeps {
  getApproval: (id: string) => Promise<Approval | null>
  getComposio: typeof getComposioClient
  getBrainFn: () => Promise<Brain>
  approveFn: (id: string, opts: ApproveOptions) => Promise<Approval>
  rejectFn: (id: string, opts: RejectOptions) => Promise<Approval>
  reindexFn: (b: Brain) => Promise<void>
  
  registrarMotivo: (id: string, mensagem: string) => Promise<void>
}

const defaults = (): ResolverDeps => ({
  getApproval, getComposio: getComposioClient, getBrainFn: getBrain,
  approveFn: approve, rejectFn: reject,
  reindexFn: async (b) => { await reconcileResilient(b.db, b.repo, b.sync, b.embedder.version()) },
  registrarMotivo: registrarMotivoDaPendencia,
})

export type Resolucao =
  | { ok: true; jaResolvida?: boolean }
  | { ok: false; motivo: 'not_found' | 'needs_config' | 'composio_off' | 'erro' }
  
  | { ok: false; motivo: 'permanente'; mensagem: string }








const emCurso = new Map<string, Promise<Resolucao>>()






function resultadoHonesto(row: Approval, action: 'approve' | 'reject'): Resolucao {
  const esperado = action === 'approve' ? 'approved' : 'rejected'
  return row.status === esperado ? { ok: true } : { ok: true, jaResolvida: true }
}


export interface ResolverExtras {
  
  correcaoDoPlano?: string
}

export async function resolverAprovacao(
  id: string, action: 'approve' | 'reject', deps?: ResolverDeps, extras?: ResolverExtras,
): Promise<Resolucao> {
  
  
  for (let pendente = emCurso.get(id); pendente; pendente = emCurso.get(id)) {
    await pendente.catch(() => {})
  }
  const p = resolverInterno(id, action, deps, extras)
  emCurso.set(id, p)
  try {
    return await p
  } finally {
    if (emCurso.get(id) === p) emCurso.delete(id)
  }
}

async function resolverInterno(
  id: string, action: 'approve' | 'reject', deps?: ResolverDeps, extras?: ResolverExtras,
): Promise<Resolucao> {
  const d = deps ?? defaults()

  let approval: Approval | null
  try {
    approval = await d.getApproval(id)
  } catch (err) {
    console.error('[approvals/resolver] getApproval falhou', err)
    return { ok: false, motivo: 'erro' }
  }
  if (!approval) return { ok: false, motivo: 'not_found' }
  
  if (approval.status !== 'pending') return { ok: true, jaResolvida: true }

  try {
    
    if (approval.kind === 'tool_action') {
      const composio = await d.getComposio()
      if (!composio) return { ok: false, motivo: 'composio_off' }
      const row = action === 'approve' ? await d.approveFn(id, { composio }) : await d.rejectFn(id, {})
      return resultadoHonesto(row, action)
    }

    
    
    if (approval.kind === 'plan') {
      const row = action === 'approve'
        ? await d.approveFn(id, {})
        
        
        : await d.rejectFn(id, { correcaoDoPlano: extras?.correcaoDoPlano })
      return resultadoHonesto(row, action)
    }

    
    if (approval.kind === 'directive') {
      const row = action === 'approve' ? await d.approveFn(id, {}) : await d.rejectFn(id, {})
      return resultadoHonesto(row, action)
    }

    
    
    
    
    
    if (approval.kind === 'custom_tool') {
      const row = action === 'approve' ? await d.approveFn(id, {}) : await d.rejectFn(id, {})
      return resultadoHonesto(row, action)
    }

    
    let b: Brain
    try {
      b = await d.getBrainFn()
    } catch (err) {
      if (err instanceof NotConfiguredError) return { ok: false, motivo: 'needs_config' }
      throw err
    }
    const github = new OctokitGithubPR(b.octokit, b.repoSlug)
    const row = action === 'approve'
      ? await d.approveFn(id, { github, reindex: () => d.reindexFn(b) })
      : await d.rejectFn(id, { github })
    return resultadoHonesto(row, action)
  } catch (err) {
    
    
    
    
    
    if (err instanceof FalhaPermanenteDaAprovacao) {
      console.warn('[approvals/resolver] falha permanente:', err.message)
      try {
        await d.registrarMotivo(id, err.mensagem)
      } catch (e) {
        console.warn('[approvals/resolver] gravar o motivo falhou (não-fatal):', e)
      }
      return { ok: false, motivo: 'permanente', mensagem: err.mensagem }
    }
    
    
    console.error('[approvals/resolver]', err)
    return { ok: false, motivo: 'erro' }
  }
}
