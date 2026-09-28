
import { getPecaComVersoes as getPecaImpl, type PecaComVersoes } from '@/data/pecas'
import { createTask as createTaskImpl } from '@/data/tasks'
import { getAgentRow as getAgentRowImpl } from '@/data/agents'
import { objetivoLiaParaTeo } from '@/lib/estudio/objetivoLiaParaTeo'
import { runTask } from '../../agent/executor/runTask'

export interface PedirArteDeps {
  getPeca?: (pecaId: string) => Promise<PecaComVersoes | null>
  createTask?: typeof createTaskImpl
  getAgentRow?: (id: string) => Promise<{ name?: string; enabled?: boolean } | null>
  run?: (id: string) => void
}


const DESIGNER_ID = 'designer'
export interface PedirArteResult { ok: boolean; taskId?: string; summary: string }


const NAO_ACHEI = 'Não achei essa peça.'


export const COPY_PEDIR_ARTE = {
  aindaBrief: 'Essa peça ainda é um brief. A copy precisa estar escrita antes de pedir a arte.',
  semCopy: 'Essa peça ainda não tem copy escrita. Peça a copy primeiro.',
  semDesigner: 'Você ainda não tem um designer na equipe. Contrate um na Loja e o pedido de arte passa a funcionar.',
  designerDeFerias: (nome: string) => `${nome} está de férias e não recebe pedidos agora. Reative em Agentes e o pedido volta a funcionar.`,
  naoAbriu: 'Não consegui abrir o pedido pro Téo. Nada foi criado até aqui.',
  pedido: 'Pedi a arte pro Téo. Ela vai nascer no Estúdio dele (/design).',
} as const

export async function pedirArte(
  input: {
    pecaId: string
    operatorId: string
    
    campanhaId?: string
    planoIndex?: number
  },
  deps: PedirArteDeps = {},
): Promise<PedirArteResult> {
  const getPeca = deps.getPeca ?? getPecaImpl
  const createTask = deps.createTask ?? createTaskImpl
  const getAgentRow = deps.getAgentRow ?? getAgentRowImpl
  const fire = deps.run ?? ((id: string) => { void runTask(id) })

  const full = await getPeca(input.pecaId)
  
  if (!full || full.operator_id !== input.operatorId) return { ok: false, summary: NAO_ACHEI }

  if (full.status === 'brief') {
    return { ok: false, summary: COPY_PEDIR_ARTE.aindaBrief }
  }
  const versao = full.versoes[full.versoes.length - 1]
  if (!versao) {
    return { ok: false, summary: COPY_PEDIR_ARTE.semCopy }
  }

  
  
  
  let designer: { name?: string; enabled?: boolean } | null = null
  try {
    designer = await getAgentRow(DESIGNER_ID)
  } catch (e) {
    console.warn('[pedirArte] leitura do designer falhou, seguindo:', e)
    designer = {}
  }
  if (designer === null) {
    return { ok: false, summary: COPY_PEDIR_ARTE.semDesigner }
  }
  if (designer.enabled === false) {
    const nome = designer.name || 'O designer'
    return { ok: false, summary: COPY_PEDIR_ARTE.designerDeFerias(nome) }
  }

  const variacoes = versao.variacoes ?? []
  const escolhida = versao.veredito?.escolhida
  const idx = typeof escolhida === 'number' && escolhida >= 0 && escolhida < variacoes.length ? escolhida : 0
  const variacao = variacoes[idx]

  const objective = objetivoLiaParaTeo({
    titulo: full.titulo || 'Peça sem título',
    formato: full.formato,
    ...(variacao ? { variacao: { angulo: variacao.angulo, texto: variacao.texto, ...(variacao.blocos ? { blocos: variacao.blocos } : {}) } } : {}),
    ...(versao.veredito?.porque ? { porque: versao.veredito.porque } : {}),
  })

  let task: { id: string }
  try {
    task = await createTask({
      agent_id: 'designer', created_by: 'copywriter', operator_id: input.operatorId, objective,
      ...(input.campanhaId ? { campanha_id: input.campanhaId } : {}),
      ...(typeof input.planoIndex === 'number' ? { plano_index: input.planoIndex } : {}),
    })
  } catch (e) {
    console.warn('[pedirArte] createTask falhou:', e)
    return { ok: false, summary: COPY_PEDIR_ARTE.naoAbriu }
  }

  fire(task.id)
  return { ok: true, taskId: task.id, summary: COPY_PEDIR_ARTE.pedido }
}
