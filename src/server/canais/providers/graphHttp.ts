




import { classificarErroMeta } from '@/lib/canais/erroMeta'
import type { EnvioFalha } from '../types'


export async function graphErro(res: Response): Promise<{ mensagem: string; codigo: number | null; subcodigo: number | null }> {
  try {
    const j = (await res.json()) as { error?: { message?: string; code?: number; error_subcode?: number } }
    return {
      mensagem: j?.error?.message ?? `HTTP ${res.status}`,
      codigo: typeof j?.error?.code === 'number' ? j.error.code : null,
      subcodigo: typeof j?.error?.error_subcode === 'number' ? j.error.error_subcode : null,
    }
  } catch { return { mensagem: `HTTP ${res.status}`, codigo: null, subcodigo: null } }
}


export async function falhaDaResposta(res: Response): Promise<EnvioFalha> {
  const { mensagem, codigo, subcodigo } = await graphErro(res)
  const c = classificarErroMeta({
    codigo, subcodigo, httpStatus: res.status,
    retryAfterHeader: res.headers?.get?.('retry-after') ?? null,
    mensagem,
  })
  return { ok: false, erro: c.legenda, codigo: c.codigo, retryable: c.retryable, retryAfterMs: c.retryAfterMs, acao: c.acao }
}
