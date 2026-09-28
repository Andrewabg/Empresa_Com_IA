import type { ChannelConfigSnapshot, ChannelConfigDelta } from '@/lib/canais/configSnapshot'
import type { EntradaBaseRow } from '@/data/baseConhecimento'

export interface ConfigInicial {
  baseSnapshot: ChannelConfigSnapshot          
  delta: ChannelConfigDelta | null
  temRascunho: boolean
  base: EntradaBaseRow[]                        
  toolkits: { slug: string; name: string; connected: boolean }[]
  customTools: { id: string; titulo: string; descricao: string }[]
  contadores: { diretrizes: number; playbooks: number; fatos: number; aprendizados: number }
}
