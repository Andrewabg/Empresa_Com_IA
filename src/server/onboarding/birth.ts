import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { serializeNote, type Note } from '@/brain/note'
import { getBrain } from '@/server/brain/runtime'
import { reconcileResilient } from '@/server/brain/reconcileResilient'
import { withCloneLock } from '@/server/brain/cloneLock'
import { setSetting, invalidateCompanyProfileCache } from '@/data/settings'
import { gravarFatosIdentidade, type UpsertFato } from './gravarNaFicha'

export interface BirthProfile {
  companyName: string
  operatorName: string
  mission: string
  voiceTone: string
}
export interface BirthResult { born: true; committed: boolean; commitSha?: string }

export interface BirthDeps {
  getBrain: typeof getBrain
  setSetting: typeof setSetting
  reconcile: typeof reconcileResilient
  
  seedRoster: () => Promise<void>
  
  upsertFato?: UpsertFato
}
const defaultDeps: BirthDeps = {
  getBrain,
  setSetting,
  reconcile: reconcileResilient,
  
  
  
  seedRoster: async () => {
    const { ensureSeedRoster } = await import('@/data/agents')
    const { SEED_PRIMARY_AGENT } = await import('@/server/agent/jarvis')
    const { SEED_COO_AGENT } = await import('@/server/agent/maestro/cooPersona')
    await ensureSeedRoster([SEED_PRIMARY_AGENT, SEED_COO_AGENT])
  },
}

const NOTE_PATH = 'identidade/empresa.md'


export async function birthCompany(profile: BirthProfile, deps: BirthDeps = defaultDeps): Promise<BirthResult> {
  
  const nascidoEm = new Date().toISOString()
  await deps.setSetting('company_name', profile.companyName)
  await deps.setSetting('operator_name', profile.operatorName)
  await deps.setSetting('mission', profile.mission)
  await deps.setSetting('voice_tone', profile.voiceTone)
  await deps.setSetting('born_at', nascidoEm)
  await deps.setSetting('company_born', 'true')
  invalidateCompanyProfileCache()

  
  
  
  
  await gravarFatosIdentidade(profile, nascidoEm, deps.upsertFato)

  
  
  
  try {
    await deps.seedRoster()
  } catch (err) {
    console.warn('[birthCompany] seed do roster inicial falhou (empresa nasce mesmo assim):', err)
  }

  
  
  
  
  
  
  try {
    
    
    
    const brain = await deps.getBrain()
    return await withCloneLock(async () => {
      const body = [
        `Nome: ${profile.companyName}`,
        `Quem comanda: ${profile.operatorName}`,
        `Missão: ${profile.mission}`,
        `Tom de voz: ${profile.voiceTone}`,
      ].join('\n')
      const serialized = serializeNote({
        id: 'identidade-empresa',
        path: NOTE_PATH,
        title: 'Identidade da empresa',
        type: 'semantic',
        tags: ['identidade'],
        confidence: 1,
        links: [],
        author_agent: 'onboarding',
        body,
      } as Note)
      const abs = join(brain.repo.dir, NOTE_PATH)
      mkdirSync(dirname(abs), { recursive: true })
      writeFileSync(abs, serialized)

      const result = await brain.committer.commitFile(NOTE_PATH, 'genesis: identidade da empresa')
      if (result.kind === 'commit') {
        await deps.reconcile(brain.db, brain.repo, brain.sync, brain.embedder.version())
        return { born: true, committed: true, commitSha: result.ref }
      }
      
      
      
      
      if (result.kind === 'pr') {
        const { registrarPrDoCerebro } = await import('../brain/aprovacoesDoCerebro')
        await registrarPrDoCerebro({
          path: NOTE_PATH, titulo: 'Identidade da empresa', corpo: body, ref: result.ref, agente: 'onboarding',
        })
      }
      return { born: true, committed: false } 
    })
  } catch (err) {
    console.warn('[birthCompany] seed do Cérebro falhou (empresa nasce mesmo assim):', err)
    return { born: true, committed: false }
  }
}


async function seedSessaoPreEmpresa(operatorId: string, perfil: 'curioso'): Promise<void> {
  const { getOrCreateOnboardingSession, saveOnboardingSession } = await import('@/data/onboardingSession')
  const s = await getOrCreateOnboardingSession(operatorId)
  if (s.perfil == null) await saveOnboardingSession({ ...s, perfil, fase: 'abertura' })
}


export async function nascerPreEmpresa(
  input: { operatorName: string; operatorId: string },
  deps: BirthDeps = defaultDeps,
  deps2: { seedSessao?: (perfil: 'curioso') => Promise<void> } = {},
): Promise<BirthResult> {
  const nascidoEm = new Date().toISOString()
  await deps.setSetting('operator_name', input.operatorName)
  await deps.setSetting('company_identity_provisional', 'true')
  await deps.setSetting('born_at', nascidoEm)
  await deps.setSetting('company_born', 'true') 
  invalidateCompanyProfileCache()
  
  
  
  await gravarFatosIdentidade({ operatorName: input.operatorName }, nascidoEm, deps.upsertFato)
  try { await deps.seedRoster() } catch (err) { console.warn('[nascerPreEmpresa] seedRoster falhou (nasce mesmo assim):', err) }
  try {
    const seed = deps2.seedSessao ?? ((p: 'curioso') => seedSessaoPreEmpresa(input.operatorId, p))
    await seed('curioso')
  } catch (err) { console.warn('[nascerPreEmpresa] pré-seed da sessão falhou (best-effort):', err) }
  return { born: true, committed: true } 
}
