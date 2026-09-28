












import {
  comFaixaEtaria, tetoQueAMetaAceita, semAgeRangeLegado, FaixaEtariaInvalidaError,
} from '@/lib/trafego/segmentacaoEdit'
import {
  createApproval as createApprovalDefault,
  listPending as listPendingDefault,
} from '@/data/approvals'
import { notificarAprovacao as notificarAprovacaoDefault } from '@/server/proativo/producers'

const SLUG_GRAPH = 'AWAVE_META_GRAPH_WRITE'

export interface ProporSegmentacaoInput { adsetId: string; ageMin: number; ageMax: number }
export interface ProporSegmentacaoResult { ok: boolean; aprovacaoId?: string; erro?: string; aviso?: string }

export interface ProporSegmentacaoDeps {
  lerTargeting: (adsetId: string) => Promise<Record<string, unknown> | null>
  lerAdset: (adsetId: string) => Promise<{ id: string; nome: string; learningStage?: string } | null>
  criarAprovacao?: typeof createApprovalDefault
  listarPendentes?: typeof listPendingDefault
  notificar?: typeof notificarAprovacaoDefault
}

export async function proporSegmentacao(
  input: ProporSegmentacaoInput, deps: ProporSegmentacaoDeps,
): Promise<ProporSegmentacaoResult> {
  const criar = deps.criarAprovacao ?? createApprovalDefault
  const listar = deps.listarPendentes ?? listPendingDefault
  const notificar = deps.notificar ?? notificarAprovacaoDefault

  
  
  try {
    comFaixaEtaria({}, input.ageMin, input.ageMax)
  } catch (e) {
    if (e instanceof FaixaEtariaInvalidaError) return { ok: false, erro: e.message }
    throw e
  }

  
  const atual = await deps.lerTargeting(input.adsetId)
  if (!atual) {
    return {
      ok: false,
      erro: 'Nao consegui ler a segmentacao atual desse conjunto, entao nao proponho a mudanca. '
        + 'Escrever sem ela apagaria pais e listas de exclusao.',
    }
  }

  
  
  if (atual.geo_locations == null) {
    return {
      ok: false,
      erro: 'A segmentacao que li nao tem pais definido, entao ela nao parece ter vindo da conta. '
        + 'Nao vou escrever por cima: isso apagaria pais e listas de exclusao.',
    }
  }

  const adset = await deps.lerAdset(input.adsetId)
  if (!adset) return { ok: false, erro: 'Nao encontrei esse conjunto.' }

  
  
  if (adset.learningStage === 'LEARNING') {
    return {
      ok: false,
      erro: `O conjunto ${adset.nome} esta em APRENDIZADO. Mexer na segmentacao agora reseta o `
        + 'learning (3 a 7 dias) e o Meta freia a entrega.',
    }
  }

  
  const pendentes = await listar().catch(() => [])
  const jaTem = pendentes.some((p) => {
    if (p.action_slug !== SLUG_GRAPH) return false
    const a = p.action_args as { endpoint?: string; body?: Record<string, unknown> } | null
    return a?.endpoint === '/' + input.adsetId && a?.body?.targeting !== undefined
  })
  if (jaTem) {
    return { ok: false, erro: 'Ja existe uma proposta de segmentacao pendente pra esse conjunto. Aprove ou rejeite ela em /aprovacoes.' }
  }

  
  const tetoReal = tetoQueAMetaAceita(atual, input.ageMax)
  const alvo = semAgeRangeLegado(comFaixaEtaria(atual, input.ageMin, tetoReal))

  const aviso = tetoReal !== input.ageMax
    ? `O Advantage+ esta ligado nesse conjunto, e com ele o Meta nao aceita teto abaixo de ${tetoReal}. Apliquei ${input.ageMin} a ${tetoReal}.`
    : undefined

  let nova
  try {
    nova = await criar({
      kind: 'tool_action',
      agent: 'gestor-trafego',
      action_slug: SLUG_GRAPH,
      action_args: {
        endpoint: '/' + input.adsetId,
        
        body: { targeting: JSON.stringify(alvo) },
        
        
        estadoAntes: { tipo: 'targeting', targeting: atual },
      },
      title: `Segmentacao de ${adset.nome}: ${input.ageMin} a ${tetoReal} anos`,
    })
  } catch {
    return { ok: false, erro: 'Nao consegui registrar a proposta de segmentacao. Tente de novo.' }
  }
  void notificar(nova)
  return { ok: true, aprovacaoId: nova.id, ...(aviso ? { aviso } : {}) }
}
