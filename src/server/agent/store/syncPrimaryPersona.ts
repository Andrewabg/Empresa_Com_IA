
import { hashPrompt } from '@/lib/persona-hash'
import type { AgentRow } from '@/data/agents'
import { PRIMARY_PERSONA_VERSION, JARVIS_PERSONA } from '../persona'
import { HASHES_PERSONA_DE_FABRICA } from '../personaFabrica'


export interface PrimaryRowLike {
  system_prompt?: string
  definition_version?: number
  synced_prompt_hash?: string | null
}


export interface PrimaryReconcilePatch {
  system_prompt: string
  definition_version: number
  synced_prompt_hash: string | null
}


function aindaEDeFabrica(row: PrimaryRowLike, personaText: string, hashesDeFabrica: readonly string[]): boolean {
  const atual = row.system_prompt?.trim() ?? ''
  if (!atual) return true
  if (atual === personaText) return true
  const hashAtual = hashPrompt(atual)
  if (row.synced_prompt_hash === hashAtual) return true
  return hashesDeFabrica.includes(hashAtual)
}


export function reconcilePrimary(
  personaVersion: number,
  personaText: string,
  row: PrimaryRowLike,
  hashesDeFabrica: readonly string[] = HASHES_PERSONA_DE_FABRICA,
): PrimaryReconcilePatch | null {
  const installedVersion = row.definition_version ?? 0
  if (installedVersion >= personaVersion) return null
  if (!aindaEDeFabrica(row, personaText, hashesDeFabrica)) return null

  return {
    system_prompt: personaText,
    definition_version: personaVersion,
    synced_prompt_hash: hashPrompt(personaText),
  }
}






export interface SyncPrimaryAgentDeps {
  
  update?: (id: string, patch: PrimaryReconcilePatch) => Promise<void>
  
  personaVersion?: number
  
  personaText?: string
}

let _syncedPrimaryVersion: number | null = null


export function _resetSyncPrimaryAgent(): void {
  _syncedPrimaryVersion = null
}

async function defaultUpdate(id: string, patch: PrimaryReconcilePatch): Promise<void> {
  const { updateAgent } = await import('@/data/agents')
  await updateAgent(id, patch)
}


export async function syncPrimaryAgent(row: AgentRow, deps?: SyncPrimaryAgentDeps): Promise<AgentRow> {
  const personaVersion = deps?.personaVersion ?? PRIMARY_PERSONA_VERSION
  const personaText = deps?.personaText ?? JARVIS_PERSONA
  const update = deps?.update ?? defaultUpdate

  
  if (_syncedPrimaryVersion !== null && _syncedPrimaryVersion >= personaVersion) return row

  try {
    const patch = reconcilePrimary(personaVersion, personaText, row)
    if (patch) {
      await update('jarvis', patch)
      _syncedPrimaryVersion = personaVersion
      return { ...row, ...patch }
    }
    
    _syncedPrimaryVersion = personaVersion
    return row
  } catch (err) {
    console.warn('[syncPrimaryAgent] re-sync best-effort da persona do primário falhou (segue; chat cobre):', err)
    
    return row
  }
}
