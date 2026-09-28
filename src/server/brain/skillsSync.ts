
import { cpSync, existsSync, rmSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import simpleGit from 'simple-git'
import { cloneDir, liveSkillsDir } from './skillsPaths'
import { withCloneLock } from './cloneLock'

const STARTER_BASE = process.env.SKILLS_DIR ?? 'skills'


export function starterSlugs(): string[] {
  if (!existsSync(STARTER_BASE)) return []
  return readdirSync(STARTER_BASE, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(STARTER_BASE, d.name, 'SKILL.md')))
    .map((d) => d.name)
}


export function reconcileBuyerShadows(): void {
  const live = liveSkillsDir()
  for (const slug of starterSlugs()) {
    const shadow = join(live, slug)
    if (existsSync(shadow)) {
      console.warn(`[skillsSync] skill buyer "${slug}" sombreia uma starter — removendo a buyer (starter vence).`)
      try { rmSync(shadow, { recursive: true, force: true }) } catch {}
    }
  }
}


function syncCloneToLive(): void {
  const clone = cloneDir()
  const skillsDir = join(clone, 'skills')
  if (existsSync(skillsDir)) cpSync(skillsDir, liveSkillsDir(), { recursive: true })
  reconcileBuyerShadows()
}


export async function bootSyncSkills(): Promise<void> {
  await withCloneLock(async () => { syncCloneToLive() })
}


export async function pullAndSyncSkillsAfterMerge(): Promise<void> {
  await withCloneLock(async () => {
    const clone = cloneDir()
    const git = simpleGit(clone)
    await git.addConfig('core.autocrlf', 'false')  
    await git.pull('origin', 'main')
    syncCloneToLive()
  })
}


export function removeLiveSkill(slug: string): void {
  try { rmSync(join(liveSkillsDir(), slug), { recursive: true, force: true }) } catch {}
}
