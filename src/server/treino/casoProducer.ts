

import { inserirCaso } from '@/data/treino'
import {
  montarEstimuloDeEdicao,
  montarEstimuloDeEscalacao,
  montarEstimuloDeMarcacao,
  type MsgCongelada,
} from '@/lib/treino/estimulo'


export async function inserirCasoMarcado(
  input: {
    agentId: string
    canalId?: string | null
    conversaId?: string | null
    mensagemId?: string | null
    mensagens: MsgCongelada[]
    ficha: unknown
    agora: string
    rascunho: string
    final: string
  },
  deps: { inserir?: typeof inserirCaso } = {},
): Promise<string> {
  const c = montarEstimuloDeEdicao(input)
  return (deps.inserir ?? inserirCaso)({
    agent_id: input.agentId,
    canal_id: input.canalId ?? null,
    conversa_id: input.conversaId ?? null,
    mensagem_id: input.mensagemId ?? null,
    origem: 'marcado',
    ...c,
  })
}


export async function inserirCasoEscalacao(
  input: {
    agentId: string
    canalId?: string | null
    conversaId?: string | null
    mensagens: MsgCongelada[]
    ficha: unknown
    agora: string
    motivo: string
  },
  deps: { inserir?: typeof inserirCaso } = {},
): Promise<string> {
  const c = montarEstimuloDeEscalacao(input)
  return (deps.inserir ?? inserirCaso)({
    agent_id: input.agentId,
    canal_id: input.canalId ?? null,
    conversa_id: input.conversaId ?? null,
    mensagem_id: null,
    origem: 'escalacao',
    ...c,
  })
}


export async function inserirCasoMarcacao(
  input: {
    agentId: string
    canalId?: string | null
    conversaId?: string | null
    mensagemId?: string | null
    mensagens: MsgCongelada[]
    ficha: unknown
    agora: string
    respostaEnviada: string
    nota?: string
  },
  deps: { inserir?: typeof inserirCaso } = {},
): Promise<string> {
  const c = montarEstimuloDeMarcacao(input)
  return (deps.inserir ?? inserirCaso)({
    agent_id: input.agentId,
    canal_id: input.canalId ?? null,
    conversa_id: input.conversaId ?? null,
    mensagem_id: input.mensagemId ?? null,
    origem: 'marcado',
    ...c,
  })
}
