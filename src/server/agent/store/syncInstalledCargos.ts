
import type { AgentTools } from '@/data/agents'
import { hashPrompt } from '@/lib/persona-hash'
import { renomearNaPersona } from '@/lib/agent-identity'
import type { MarketingSeed } from './marketingSeeds'


export interface RowLike {
  
  name?: string
  tools?: AgentTools | null
  system_prompt?: string
  definition_version?: number
  synced_prompt_hash?: string | null
}


export interface ReconcilePatch {
  tools?: AgentTools
  system_prompt?: string
  definition_version?: number
  synced_prompt_hash?: string | null
}


export function reconcileCargo(catalogDef: MarketingSeed, agentRow: RowLike): ReconcilePatch | null {
  const patch: ReconcilePatch = {}

  
  const existing = agentRow.tools?.required_toolkits ?? []
  const wanted = catalogDef.tools?.required_toolkits ?? []
  const missing = wanted.filter((t) => !existing.includes(t))
  if (missing.length > 0) {
    
    patch.tools = { ...agentRow.tools, required_toolkits: [...existing, ...missing] }
  }

  
  
  
  
  const catalogVersion = catalogDef.version ?? 0
  const installedVersion = agentRow.definition_version ?? 0
  if (catalogVersion > installedVersion && typeof catalogDef.system_prompt === 'string') {
    
    
    
    
    
    const persona = renomearNaPersona(
      catalogDef.system_prompt,
      catalogDef.name ?? '',
      agentRow.name ?? '',
    )
    patch.system_prompt = persona
    patch.definition_version = catalogVersion
    patch.synced_prompt_hash = hashPrompt(persona)
    
    patch.tools ??= { ...agentRow.tools, required_toolkits: [...existing, ...missing] }
  }

  
  
  
  
  
  const flagsNovas = flagsAusentesDoCatalogo(catalogDef.tools, agentRow.tools)
  if (Object.keys(flagsNovas).length > 0) {
    patch.tools = {
      ...(patch.tools ?? { ...agentRow.tools, required_toolkits: [...existing, ...missing] }),
      ...flagsNovas,
    }
  }

  return Object.keys(patch).length > 0 ? patch : null
}


export function flagsAusentesDoCatalogo(
  catalogTools: AgentTools | undefined,
  rowTools: AgentTools | null | undefined,
): Record<string, boolean> {
  const naLinha = (rowTools ?? {}) as Record<string, unknown>
  const novas: Record<string, boolean> = {}
  for (const [chave, valor] of Object.entries((catalogTools ?? {}) as Record<string, unknown>)) {
    if (valor !== true) continue
    if (Object.prototype.hasOwnProperty.call(naLinha, chave)) continue
    novas[chave] = true
  }
  return novas
}


export interface SyncInstalledCargosDeps {
  
  getCargos?: () => Promise<MarketingSeed[]>
  
  getRow?: (id: string) => Promise<RowLike | null>
  
  update?: (id: string, patch: ReconcilePatch) => Promise<void>
}

let _syncedChave: string | null = null


export function _resetSyncInstalledCargos(): void {
  _syncedChave = null
}


export function chaveDoMemo(cargos: readonly MarketingSeed[]): string {
  const maxVersion = Math.max(0, ...cargos.map((c) => c.version ?? 0))
  const flags = cargos
    .map((c) => {
      const ligadas = Object.entries((c.tools ?? {}) as Record<string, unknown>)
        .filter(([, v]) => v === true)
        .map(([k]) => k)
        .sort()
      return `${c.id}=${ligadas.join('+')}`
    })
    .sort()
    .join(';')
  return `${maxVersion}|${hashPrompt(flags)}`
}

async function defaultGetCargos(): Promise<MarketingSeed[]> {
  const { getCargoCatalog } = await import('./cargoCatalog')
  
  
  
  return getCargoCatalog({ cacheOnly: true })
}
async function defaultGetRow(id: string): Promise<RowLike | null> {
  const { getAgentRow } = await import('@/data/agents')
  return getAgentRow(id)
}
async function defaultUpdate(id: string, patch: ReconcilePatch): Promise<void> {
  const { updateAgent } = await import('@/data/agents')
  await updateAgent(id, patch)
}


export async function syncInstalledCargos(deps: SyncInstalledCargosDeps = {}): Promise<void> {
  try {
    const getCargos = deps.getCargos ?? defaultGetCargos
    const getRow = deps.getRow ?? defaultGetRow
    const update = deps.update ?? defaultUpdate

    const cargos = await getCargos()
    if (cargos.length === 0) return 
    const chave = chaveDoMemo(cargos)
    if (_syncedChave !== null && _syncedChave === chave) return 

    for (const def of cargos) {
      const row = await getRow(def.id)
      if (!row) continue 
      const patch = reconcileCargo(def, row)
      if (patch) await update(def.id, patch)
    }
    _syncedChave = chave
  } catch (err) {
    console.warn('[syncInstalledCargos] re-sync best-effort falhou (segue; chat cobre):', err)
  }
}
