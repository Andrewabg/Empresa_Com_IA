
import type { CampoHumano } from '@/lib/aprovacoes/humanizarAto'


export interface MockBriefing {
  greeting: string        
  body: string            
  date: string            
  highlights: string[]    
}


export interface MockApproval {
  id: string
  kind: 'brain_pr' | 'tool_action' | 'plan'
  title: string
  
  diff?: string
  
  prUrl?: string
  
  path?: string
  
  action?: {
    sentence: string                    
    principais: CampoHumano[]           
    detalhes: CampoHumano[]             
  }
  
  origem?: string
  
  launchArgs?: {
    message: string
    headline?: string
    cta: string
    link: string
    artifactId: string
  }
  
  avisos?: { tipo: string; texto: string }[]
  agent: string           
  reason: string          
  createdAt: string       
}


export interface MockNote {
  id: string
  path: string            
  title: string
  snippet: string         
  
  snippetParcial?: boolean
  author_agent: string | null  
  source?: string | null  
  updatedAt: string       
}


export interface MockCostPoint {
  date: string                         
  usd: number                          
  byAgent?: Record<string, number>     
  byTool?: Record<string, number>      
}


export interface MockCostSummary {
  budgetUsd: number              
  spentUsd: number               
  remainingUsd: number           
  topAgents: Array<{ agent: string; usd: number }>
  topTools: Array<{ tool: string; usd: number }>
  series: MockCostPoint[]        
}


export interface MockMessage {
  id: string
  role: 'user' | 'jarvis'
  text: string
  at: string    
}


export interface LiveEvent {
  id: string
  type: 'memory' | 'action' | 'tool'
  label: string
  at: number    
  
  agent?: string | null
}


export interface DemoStep {
  at: number       
  kind:
    | 'user_speaks'
    | 'wave_listening'
    | 'wave_thinking'
    | 'action_taken'
    | 'memory_born'
    | 'curator_organizes'
    | 'commit'
    | 'wave_pulse'
    | 'wave_idle'
  payload?: unknown
}
