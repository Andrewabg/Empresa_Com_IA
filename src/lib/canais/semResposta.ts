


export const KIND_SEM_RESPOSTA = 'sem_resposta'


export const MARCA_SEM_RESPOSTA =
  '[não consegui responder este cliente e parei de tentar. A resposta agora precisa ser sua.]'


export function avisoSemResposta(contatoNome: string): { titulo: string; corpo: string } {
  const nome = contatoNome.trim() || 'Um cliente'
  return {
    titulo: `${nome} ficou sem resposta`,
    corpo: [
      `Tentei responder ${nome} algumas vezes e não consegui.`,
      'O cliente não recebeu nada e nada foi prometido a ele em seu nome.',
      'Abra o Inbox e responda você.',
    ].join('\n'),
  }
}


export const EVENTO_SEM_RESPOSTA = 'Atendimento: um cliente ficou sem resposta'
