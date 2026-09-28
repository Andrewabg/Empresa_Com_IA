
import type { AgentTools, AgentBudget } from '@/data/agents'

export interface MarketingSeed {
  id: string
  name: string
  role: string
  tagline: string
  descricao: string
  system_prompt: string
  tools: AgentTools
  skills: string[]
  brain_read_scopes: string[]
  budget: AgentBudget
  voice: string 
  
  suggested_manager?: string
  
  version?: number
  
  baseline_prompt_hash?: string
}
