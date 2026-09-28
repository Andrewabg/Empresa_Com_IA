








import { acaoInversa, EstadoAntesAusenteError, type AcaoInversa, type EstadoAntes } from '@/lib/trafego/desfazer'
import { reaisParaCentavos } from '@/lib/trafego/normalize'
import {
  getApproval as getApprovalDefault,
  createApproval as createApprovalDefault,
  listPending as listPendingDefault,
} from '@/data/approvals'
import { notificarAprovacao as notificarAprovacaoDefault } from '@/server/proativo/producers'


const SLUG_GRAPH = 'AWAVE_META_GRAPH_WRITE'

export interface ProporDesfazerInput { approvalId: string }
export interface ProporDesfazerResult { ok: boolean; novaAprovacaoId?: string; erro?: string }

export interface ProporDesfazerDeps {
  lerAprovacao?: typeof getApprovalDefault
  criarAprovacao?: typeof createApprovalDefault
  listarPendentes?: typeof listPendingDefault
  notificar?: typeof notificarAprovacaoDefault
  
  escreverNaMeta?: (...args: unknown[]) => unknown
}


function payloadDaInversa(slug: string, inversa: AcaoInversa): Record<string, unknown> | null {
  if (slug !== SLUG_GRAPH) return null
  const body: Record<string, unknown> =
    inversa.tipo === 'orcamento' ? { [inversa.unidade]: reaisParaCentavos(inversa.valorNovo) }
    : inversa.tipo === 'targeting' ? { targeting: JSON.stringify(inversa.targeting) }
    : { status: inversa.status }
  return { endpoint: '/' + inversa.entityId, body }
}

export async function proporDesfazer(
  input: ProporDesfazerInput, deps: ProporDesfazerDeps = {},
): Promise<ProporDesfazerResult> {
  const ler = deps.lerAprovacao ?? getApprovalDefault
  const criar = deps.criarAprovacao ?? createApprovalDefault
  const listar = deps.listarPendentes ?? listPendingDefault
  const notificar = deps.notificar ?? notificarAprovacaoDefault

  const original = await ler(input.approvalId)
  if (!original) return { ok: false, erro: 'Nao encontrei essa aprovacao.' }
  if (original.status !== 'approved') {
    return { ok: false, erro: 'Essa acao nao foi aplicada, entao nao ha o que desfazer.' }
  }

  const args = (original.action_args ?? {}) as { endpoint?: string; estadoAntes?: EstadoAntes }
  
  
  const entityId = (args.endpoint ?? '').replace(/^\//, '')
  if (!entityId) return { ok: false, erro: 'A aprovacao original nao registrou a entidade.' }

  let inversa: AcaoInversa
  try {
    inversa = acaoInversa(args.estadoAntes ?? null, entityId)
  } catch (e) {
    if (e instanceof EstadoAntesAusenteError) {
      return {
        ok: false,
        erro: 'Essa aprovacao nao guardou o estado anterior (ela e mais antiga que o freio de saida), '
          + 'entao nao da pra desfazer automaticamente.',
      }
    }
    throw e
  }

  const slug = original.action_slug ?? ''
  const payload = payloadDaInversa(slug, inversa)
  if (!payload) {
    return {
      ok: false,
      erro: 'Nao sei desfazer esse tipo de acao automaticamente sem risco de mandar um comando '
        + 'errado pra conta. Da pra voltar a mao no Gerenciador, e o valor anterior esta na propria aprovacao.',
    }
  }

  
  
  const pendentes = await listar().catch(() => [])
  if (pendentes.some((p) => (p.action_args as { desfazDe?: string } | null)?.desfazDe === original.id)) {
    return { ok: false, erro: 'Ja existe um desfazer pendente dessa acao. Aprove ou rejeite ele em /aprovacoes.' }
  }

  let nova
  try {
    nova = await criar({
      kind: 'tool_action',
      agent: original.agent ?? 'gestor-trafego',
      action_slug: slug,
      action_args: { ...payload, desfazDe: original.id },
      title: `Desfazer: voltar ${entityId} ao estado anterior`,
    })
  } catch {
    return { ok: false, erro: 'Nao consegui registrar a proposta de desfazer. Tente de novo.' }
  }
  void notificar(nova)
  return { ok: true, novaAprovacaoId: nova.id }
}
