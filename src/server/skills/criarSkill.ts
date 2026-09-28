
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import type { Octokit } from '@octokit/rest'
import { validateSkillSlug, serializeSkillMd } from '@/lib/skill-md'
import { openPrForPath } from '@/server/brain/escalatePr'
import { createApproval } from '@/data/approvals'
import { parsePrNumber } from '@/server/approvals/github'
import { withCloneLock } from '@/server/brain/cloneLock'
import { cloneDir, liveSkillsDir } from '@/server/brain/skillsPaths'
import { notificarAprovacao } from '@/server/proativo/producers'


const STARTER_BASE = process.env.SKILLS_DIR ?? 'skills'

export interface CriarSkillInput {
  slug: string
  description: string
  instructions: string
  agent?: string
  reason?: string
}

export interface CriarSkillResult {
  slug: string
  pr_url?: string
  approvalId: string
}


export class CriarSkillError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CriarSkillError'
  }
}

export interface CriarSkillDeps {
  cloneDir: () => string
  liveSkillsDir: () => string
  
  starterHasSlug: (slug: string) => boolean
  
  buyerHasSlug: (slug: string) => boolean
  
  brainPr: () => Promise<{ octokit?: Octokit; repoSlug?: string }>
  
  writeSkillFile: (absPath: string, content: string) => void
  openPr: typeof openPrForPath
  createApproval: typeof createApproval
  refreshCatalog: () => Promise<void>
  withLock: <T>(fn: () => Promise<T>) => Promise<T>
  
  cleanup: (absDir: string) => void
  
  notificarAprovacao?: typeof notificarAprovacao
}

const defaultDeps: CriarSkillDeps = {
  cloneDir,
  liveSkillsDir,
  starterHasSlug: (slug) => existsSync(join(STARTER_BASE, slug, 'SKILL.md')),
  buyerHasSlug: (slug) => existsSync(join(liveSkillsDir(), slug, 'SKILL.md')),
  
  brainPr: async () => {
    const { getBrain } = await import('@/server/brain/runtime')
    const b = await getBrain()
    return { octokit: b.octokit, repoSlug: b.repoSlug }
  },
  writeSkillFile: (absPath, content) => {
    mkdirSync(dirname(absPath), { recursive: true })
    writeFileSync(absPath, content)
  },
  openPr: openPrForPath,
  createApproval,
  refreshCatalog: async () => {
    const { skillsWorkspaceReady } = await import('@/server/agent/skills/workspace')
    const ws = await skillsWorkspaceReady()
    await ws.skills?.refresh()
  },
  withLock: withCloneLock,
  cleanup: (absDir) => {
    rmSync(absDir, { recursive: true, force: true })
  },
}


export async function criarSkill(
  input: CriarSkillInput,
  deps?: Partial<CriarSkillDeps>,
): Promise<CriarSkillResult> {
  const d = { ...defaultDeps, ...deps }
  const { slug } = input

  
  if (!validateSkillSlug(slug)) {
    throw new CriarSkillError(
      `Slug de skill inválido: "${slug}". Use minúsculas, dígitos e hífens simples (1..64).`,
    )
  }

  
  
  
  
  if (d.starterHasSlug(slug)) {
    throw new CriarSkillError(`slug "${slug}" colide com uma skill starter — escolha outro nome`)
  }

  
  
  
  if (d.buyerHasSlug(slug)) {
    throw new CriarSkillError(`slug "${slug}" já existe na biblioteca do comprador — equipe a existente em vez de re-autorar`)
  }

  
  const content = serializeSkillMd({ name: slug, description: input.description, instructions: input.instructions })

  
  const { octokit, repoSlug } = await d.brainPr()

  const cDir = d.cloneDir()
  const lDir = d.liveSkillsDir()
  const liveSkillDir = join(lDir, slug)
  const cloneSkillDir = join(cDir, 'skills', slug)
  const path = `skills/${slug}/SKILL.md` 

  
  
  
  
  
  
  const ref = await d.withLock(async () => {
    try {
      d.writeSkillFile(join(liveSkillDir, 'SKILL.md'), content) 
      d.writeSkillFile(join(cloneSkillDir, 'SKILL.md'), content) 
      const r = await d.openPr({ dir: cDir, path, message: `nova skill ${slug}`, octokit, repoSlug })
      return r.ref
    } catch (e) {
      try { d.cleanup(liveSkillDir) } catch {}
      try { d.cleanup(cloneSkillDir) } catch {}
      throw e
    }
  })

  
  const approval = await d.createApproval({
    kind: 'brain_pr',
    title: `Nova skill: ${slug}`,
    diff: content,
    path,
    pr_url: ref,
    pr_number: parsePrNumber(ref) ?? undefined,
    agent: input.agent,
    reason: input.reason,
  })

  
  
  void Promise.resolve()
    .then(() => (d.notificarAprovacao ?? notificarAprovacao)(approval))
    .catch(() => {})

  
  try {
    await d.refreshCatalog()
  } catch (err) {
    console.warn('[criarSkill] refresh do catálogo de skills falhou (não-fatal):', err)
  }

  return { slug, pr_url: ref, approvalId: approval.id }
}
