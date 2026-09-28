
import { planejarCampanha as planejarImpl } from '../tools/estudio/planejarCampanha'
import { produzirCampanha as produzirImpl } from '../tools/estudio/produzirCampanha'
import { briefDoPedido, pedidoEstaCompleto } from '@/lib/entrega/pedido'
import type { PedidoDeEntrega } from '@/lib/entrega/types'
import type { CampanhaView } from '@/lib/estudio/types'

export const COPY_ABRIR_ENTREGA = {
  semObjetivo: 'Me diz o objetivo e quantas peças você quer, e eu abro a entrega.',
  naoPlanejou: 'Não consegui montar o plano desta entrega agora. Nada foi criado até aqui.',
  aberta: (n: number) => `A entrega começou: ${n} ${n === 1 ? 'peça' : 'peças'} na esteira.`,
  
  acompanhe: 'Acompanhe em Entregas: cada item mostra quem está com ele agora.',
  
  planejei: (nome: string, bigIdea: string) => (bigIdea ? `Montei "${nome}": ${bigIdea}.` : `Montei "${nome}".`),
  planoParado:
    'O plano ficou montado, mas eu não consegui colocar as peças na esteira. Abra a entrega e mande produzir.',
} as const

export interface AbrirEntregaDeps {
  planejar?: typeof planejarImpl
  produzir?: typeof produzirImpl
}

export interface AbrirEntregaResult {
  ok: boolean
  campanha?: CampanhaView
  
  avisos: string[]
  mensagem: string
}

export async function abrirEntrega(
  input: { pedido: PedidoDeEntrega; operatorId: string; agentId?: string },
  deps: AbrirEntregaDeps = {},
): Promise<AbrirEntregaResult> {
  const planejar = deps.planejar ?? planejarImpl
  const produzir = deps.produzir ?? produzirImpl

  if (!pedidoEstaCompleto(input.pedido)) {
    return { ok: false, avisos: [], mensagem: COPY_ABRIR_ENTREGA.semObjetivo }
  }

  const plano = await planejar(
    { brief: briefDoPedido(input.pedido) },
    { operatorId: input.operatorId, ...(input.agentId ? { actingAgentId: input.agentId } : {}) },
  )
  const patch = plano.patch
  if (!patch || patch.entidade !== 'campanha') {
    
    
    return { ok: false, avisos: plano.avisos ?? [], mensagem: plano.output || COPY_ABRIR_ENTREGA.naoPlanejou }
  }

  const campanha = patch.campanha
  try {
    const r = await produzir({ campanhaId: campanha.id, operatorId: input.operatorId })
    return {
      ok: true,
      campanha,
      avisos: plano.avisos ?? [],
      mensagem: r.produzidas ? COPY_ABRIR_ENTREGA.aberta(r.produzidas) : r.summary,
    }
  } catch (e) {
    
    
    console.warn('[abrirEntrega] a esteira não arrancou (o plano ficou salvo):', e)
    return { ok: true, campanha, avisos: plano.avisos ?? [], mensagem: COPY_ABRIR_ENTREGA.planoParado }
  }
}
