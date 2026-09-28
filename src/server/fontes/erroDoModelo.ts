







import { NotConfiguredError } from '@/server/brain/runtime'
import { classificarFalhaDoModelo, COPY_FALHA_MODELO_FONTES } from '@/lib/modelo/falhaDoModelo'
import { ERRO_CHAVE_OPENAI_AUSENTE } from '@/lib/fontes/mensagens'


export class FalhaAoPropor extends Error {
  readonly causa: unknown

  constructor(causa: unknown) {
    super(causa instanceof Error ? causa.message : String(causa))
    this.name = 'FalhaAoPropor'
    this.causa = causa
  }
}


export function copyDaFalhaDoModelo(e: unknown, generica: string): string {
  
  
  if (e instanceof NotConfiguredError) return ERRO_CHAVE_OPENAI_AUSENTE
  const motivo = classificarFalhaDoModelo(e)
  return motivo ? COPY_FALHA_MODELO_FONTES[motivo] : generica
}
