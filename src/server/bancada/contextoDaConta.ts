

import { getAccountMemory as getAccountMemoryDefault } from '@/data/accountMemory'
import { listAcoesMetaRecentes as listAcoesMetaRecentesDefault } from '@/data/approvals'
import { renderAccountMemory, mergeAccountMemory } from '@/lib/trafego/accountMemory'
import { renderMudancasRecentes } from '@/lib/trafego/estabilizacao'
import { JANELA_APRENDIZADO_MS } from '@/lib/trafego/atribuicao'
import { frameDaConta, renderContextoDaConta } from '@/lib/trafego/graph/contextoDaConta'
import type { ContextoCarregado } from '@/lib/trafego/graph/investigacao'
import type { Bancada } from '@/lib/bancada/tipos'

export async function carregarContextoDaConta(
  b: Bancada,
  ctx: { operatorId?: string; contaId: string | null; agoraMs: number },
  deps: { getAccountMemory?: typeof getAccountMemoryDefault; listAcoesMetaRecentes?: typeof listAcoesMetaRecentesDefault } = {},
): Promise<ContextoCarregado> {
  const mem = ctx.operatorId && ctx.contaId
    ? await (deps.getAccountMemory ?? getAccountMemoryDefault)(ctx.operatorId, ctx.contaId).catch(() => null)
    : null
  const frame = frameDaConta(mem?.perfil?.perfilConta)
  
  
  
  const acoes = Number.isFinite(ctx.agoraMs)
    ? await (deps.listAcoesMetaRecentes ?? listAcoesMetaRecentesDefault)(
        new Date(ctx.agoraMs - JANELA_APRENDIZADO_MS).toISOString(),
      ).catch(() => [])
    : []
  
  
  
  const mudancas = renderMudancasRecentes(acoes)
    .split('\n')
    .filter((l) => l.trim().startsWith('-'))
    .join('\n')
  
  
  
  const texto = renderContextoDaConta({
    frame,
    faixas: Object.values(b.baseline?.faixas ?? {}),
    ficha: mem ? renderAccountMemory(mergeAccountMemory(mem, {}, { origem: 'reflector', at: '' })) : '',
    mudancas,
  })
  return { texto, frame }
}
