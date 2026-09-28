
export interface MsgCongelada { role: 'user' | 'assistant'; content: string }
export interface Estimulo { mensagens: MsgCongelada[]; ficha: unknown; agora: string }
export interface CasoNovo { estimulo: Estimulo; resposta_dada: string | null; sinal: string }

export function montarEstimuloDeEdicao(input: {
  mensagens: MsgCongelada[]; ficha: unknown; agora: string; rascunho: string; final: string
}): CasoNovo {
  return {
    estimulo: { mensagens: input.mensagens, ficha: input.ficha, agora: input.agora },
    resposta_dada: input.rascunho,
    sinal: `Ela respondeu "${input.rascunho.trim()}"; o certo era "${input.final.trim()}".`,
  }
}

export function montarEstimuloDeEscalacao(input: {
  mensagens: MsgCongelada[]; ficha: unknown; agora: string; motivo: string
}): CasoNovo {
  return {
    estimulo: { mensagens: input.mensagens, ficha: input.ficha, agora: input.agora },
    resposta_dada: null,
    sinal: `Não soube responder e escalou (${input.motivo.trim()}).`,
  }
}

export function montarEstimuloDeMarcacao(input: {
  mensagens: MsgCongelada[]; ficha: unknown; agora: string; respostaEnviada: string; nota?: string
}): CasoNovo {
  return {
    estimulo: { mensagens: input.mensagens, ficha: input.ficha, agora: input.agora },
    resposta_dada: input.respostaEnviada,
    sinal: input.nota?.trim() ? `Marcado como errado: ${input.nota.trim()}` : 'Marcado como errado pelo dono (sem nota).',
  }
}
