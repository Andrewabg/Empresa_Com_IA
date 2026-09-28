


export const CONFIG_SECTIONS_REVISION = 'id_d87r668wuf26mrep0zlpqgk2p' as const

export type ConfigSectionId =
  | 'essenciais'
  | 'acoesExternas'
  | 'canais'
  | 'fontes'
  | 'licenca'
  | 'preferencias'
  | 'custo'
  | 'equipe'
  | 'perigo'

export interface ConfigSection {
  id: ConfigSectionId
  
  label: string
  
  required: boolean
}


export interface EssentialFlags {
  openai: boolean
  githubToken: boolean
  repo: boolean
}


export type SectionStatus = 'pending' | 'done' | 'optional'

export const CONFIG_SECTIONS: readonly ConfigSection[] = [
  { id: 'essenciais', label: 'Essenciais', required: true },
  { id: 'acoesExternas', label: 'Ações externas', required: false },
  { id: 'canais', label: 'Canais', required: false },
  
  { id: 'fontes', label: 'Fontes de dados', required: false },
  { id: 'licenca', label: 'Licença', required: false },
  { id: 'preferencias', label: 'Preferências', required: false },
  
  
  { id: 'custo', label: 'Custo', required: false },
  
  { id: 'equipe', label: 'Equipe', required: false },
  
  { id: 'perigo', label: 'Zona de perigo', required: false },
]

const ESSENTIALS_DONE = (f: EssentialFlags): boolean => f.openai && f.githubToken && f.repo


export function sectionStatus(id: ConfigSectionId, flags: EssentialFlags): SectionStatus {
  if (id === 'essenciais') return ESSENTIALS_DONE(flags) ? 'done' : 'pending'
  return 'optional'
}


export function firstPendingSection(flags: EssentialFlags): ConfigSectionId {
  const pending = CONFIG_SECTIONS.find((s) => s.required && sectionStatus(s.id, flags) === 'pending')
  return (pending ?? CONFIG_SECTIONS[0]).id
}


export function isValidSectionId(x: string): x is ConfigSectionId {
  return CONFIG_SECTIONS.some((s) => s.id === x)
}
