








import { COPY_TESTE_CHAVE, type MotivoFalhaModelo } from './falhaDoModelo'


export const TESTE_OPENAI_OK = 'chave válida, a OpenAI respondeu'


export const TESTE_OPENAI_INVALIDA = 'chave inválida'

export interface ResultadoDoTesteOpenAi {
  ok: boolean
  detail?: string
  motivo?: MotivoFalhaModelo
}


export function textoDoTesteOpenAi(r: ResultadoDoTesteOpenAi): string {
  if (r.ok) return TESTE_OPENAI_OK
  if (r.motivo) return COPY_TESTE_CHAVE[r.motivo]
  return r.detail ? `${TESTE_OPENAI_INVALIDA} (${r.detail})` : TESTE_OPENAI_INVALIDA
}
