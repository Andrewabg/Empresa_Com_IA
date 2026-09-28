


export interface AgentTools {
  buscarCerebro?: boolean
  proporMemoria?: boolean
  composio?: boolean
  emitirArtefato?: boolean
  gerarImagem?: boolean
  composio_toolkits?: string[]
  required_toolkits?: string[]
  
  custom_tools?: string[]
}

export interface Agent {
  id: string
  name: string
  role: string
  
  system_prompt?: string
  model: string | null
  tools: AgentTools
  skills: string[]
  enabled: boolean
  is_primary: boolean
  voice: string | null
  
  voz_desligada?: boolean
  manager_id: string | null
}


export interface DesligadoUI {
  id: string
  name: string
  role: string
  dismissed_at: string
}



export interface DiretrizUI { texto: string; origem: string; at: string; substitui?: string }


export function corpoDaDiretrizParaSalvar(d: DiretrizUI): DiretrizUI {
  return { texto: d.texto, origem: d.origem, at: d.at, ...(d.substitui ? { substitui: d.substitui } : {}) }
}
export interface AprendizadoUI { id: string; summary: string; created_at: string }
export interface SkillMeta { slug: string; name: string; description: string }


export interface TarefaUI {
  objetivo: string
  status: string
}

export type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: number }
  | { kind: 'error'; text: string }



export type ToolFlag = 'buscarCerebro' | 'proporMemoria' | 'composio' | 'emitirArtefato' | 'gerarImagem'


export const TOOL_DEFS: { key: ToolFlag; label: string; help: string }[] = [
  { key: 'buscarCerebro', label: 'Buscar no Cérebro', help: 'Deixa o agente consultar as memórias e notas da empresa antes de responder.' },
  { key: 'proporMemoria', label: 'Propor memórias', help: 'Permite que o agente sugira gravar novas notas no Cérebro.' },
  { key: 'composio', label: 'Ações externas (Composio)', help: 'Habilita ler e (com aprovação) agir no Gmail, Calendar e outros apps.' },
  { key: 'emitirArtefato', label: 'Emitir artefato', help: 'Produz entregáveis de texto no Canvas — contrato, proposta, copy, código.' },
  { key: 'gerarImagem', label: 'Gerar imagem', help: 'Gera imagens no Canvas.' },
]
