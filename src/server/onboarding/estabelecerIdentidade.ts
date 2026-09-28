import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { serializeNote, type Note } from '@/brain/note'
import { getBrain } from '@/server/brain/runtime'
import { reconcileResilient } from '@/server/brain/reconcileResilient'
import { withCloneLock } from '@/server/brain/cloneLock'
import { setSetting, invalidateCompanyProfileCache } from '@/data/settings'
import { gravarFatosIdentidade, type UpsertFato } from './gravarNaFicha'

export interface IdentidadeInput {
  companyName: string
  mission?: string
}

export interface EstabelecerIdentidadeDeps {
  setSetting: (key: string, value: string) => Promise<void>
  invalidate: () => void
  
  escreverNota: (input: IdentidadeInput) => Promise<void>
  
  upsertFato?: UpsertFato
  
  now?: () => string
}

const NOTE_PATH = 'identidade/empresa.md'


export async function escreverNotaIdentidade(input: IdentidadeInput): Promise<void> {
  
  
  const brain = await getBrain()
  await withCloneLock(async () => {
    const body = [
      `Nome: ${input.companyName}`,
      ...(input.mission ? [`Missão: ${input.mission}`] : []),
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

    const result = await brain.committer.commitFile(NOTE_PATH, 'identidade: empresa estabelecida na conversão')
    if (result.kind === 'commit') {
      await reconcileResilient(brain.db, brain.repo, brain.sync, brain.embedder.version())
    } else if (result.kind === 'pr') {
      
      
      
      
      const { registrarPrDoCerebro } = await import('../brain/aprovacoesDoCerebro')
      await registrarPrDoCerebro({
        path: NOTE_PATH, titulo: 'Identidade da empresa', corpo: body, ref: result.ref, agente: 'onboarding',
      })
    }
    
  })
}

const defaultDeps: EstabelecerIdentidadeDeps = {
  setSetting,
  invalidate: invalidateCompanyProfileCache,
  escreverNota: escreverNotaIdentidade,
}


export async function estabelecerIdentidadeEmpresa(
  input: IdentidadeInput,
  deps: EstabelecerIdentidadeDeps = defaultDeps,
): Promise<void> {
  
  
  
  if (!input.companyName?.trim()) {
    console.warn('[estabelecerIdentidadeEmpresa] companyName vazio — no-op (mantém provisório)')
    return
  }

  
  await deps.setSetting('company_name', input.companyName)
  if (input.mission) await deps.setSetting('mission', input.mission)

  
  deps.invalidate()

  
  
  
  
  
  const now = deps.now ?? (() => new Date().toISOString())
  await gravarFatosIdentidade(
    { companyName: input.companyName, mission: input.mission },
    now(),
    deps.upsertFato,
  )

  
  
  try {
    await deps.escreverNota(input)
  } catch (err) {
    console.warn('[estabelecerIdentidadeEmpresa] escrita da nota de identidade falhou (identidade já salva):', err)
  }

  
  
  await deps.setSetting('company_identity_provisional', 'false')
}
