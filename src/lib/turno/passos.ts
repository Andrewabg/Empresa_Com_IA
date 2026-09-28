





import type { AgentBudget, AgentTools } from '@/data/agents'
import type { Papel } from '@/lib/equipe'

export type SuperficieDoTurno = 'chat' | 'executor' | 'telegram'
export const PASSOS_PADRAO = 8
export const PASSOS_DA_INVESTIGACAO_NO_CHAT = 30
export const PASSOS_MINIMOS_DA_INVESTIGACAO_NO_EXECUTOR = 20

export function passosDoAgente(
  tools: AgentTools | null | undefined,
  papel: Papel | undefined,
  superficie: SuperficieDoTurno,
  budget?: AgentBudget | null,
): number {
  const base = superficie === 'executor' ? (budget?.per_invocation_steps ?? PASSOS_PADRAO) : PASSOS_PADRAO
  if (!tools?.investigacao) return base
  if (superficie === 'chat') return papel === 'dono' ? PASSOS_DA_INVESTIGACAO_NO_CHAT : PASSOS_PADRAO
  
  
  
  
  if (superficie === 'executor') return papel === 'dono' ? Math.max(base, PASSOS_MINIMOS_DA_INVESTIGACAO_NO_EXECUTOR) : base
  return base
}
