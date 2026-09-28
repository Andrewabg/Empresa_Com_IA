
import { Workspace, LocalFilesystem, CompositeFilesystem } from '@mastra/core/workspace'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { liveSkillsDir } from '@/server/brain/skillsPaths'
import { skillSetSignature } from '@/lib/skills'
import { withTimeout } from '@/lib/withTimeout'

const STARTER_BASE = process.env.SKILLS_DIR ?? 'skills'
const STARTER_MOUNT = '/starter'
const BUYER_MOUNT = '/buyer'
const WORKSPACE_INIT_TIMEOUT_MS = Number(process.env.SKILLS_INIT_TIMEOUT_MS) || 15_000


export function initWorkspaceBounded(ws: { init(): Promise<void> }, ms = WORKSPACE_INIT_TIMEOUT_MS): Promise<void> {
  return withTimeout(ws.init(), ms, 'workspace.init').catch((err) => {
    console.warn('[skills] Workspace.init() falhou/timeout (não-fatal):', (err as Error).message)
  })
}

let _cached: Workspace | null = null
let _initPromise: Promise<void> | null = null


const _bySet = new Map<string, Workspace>()


function buildComposite() {
  return new CompositeFilesystem({
    mounts: {
      [STARTER_MOUNT]: new LocalFilesystem({ basePath: STARTER_BASE, readOnly: true }),
      [BUYER_MOUNT]: new LocalFilesystem({ basePath: liveSkillsDir() }),
    },
  })
}


export function resolveSkillPaths(equipped: string[]): string[] {
  const liveBase = liveSkillsDir()
  return [...new Set(equipped)].map((slug) =>
    existsSync(join(liveBase, slug, 'SKILL.md')) ? `${BUYER_MOUNT}/${slug}` : `${STARTER_MOUNT}/${slug}`,
  )
}


export function buildSkillsWorkspace(): Workspace {
  if (_cached) return _cached
  const ws = new Workspace({
    filesystem: buildComposite(),
    skills: [STARTER_MOUNT, BUYER_MOUNT], 
    bm25: true,
    tools: { enabled: false }, 
  })
  
  
  _initPromise = initWorkspaceBounded(ws)
  void _initPromise
  _cached = ws
  return ws
}


export async function skillsWorkspaceReady(): Promise<Workspace> {
  const ws = buildSkillsWorkspace() 
  await _initPromise 
  return ws
}


export function buildSkillsWorkspaceForSkills(equipped: string[]): Workspace {
  if (!equipped.length) return buildSkillsWorkspace() 
  const sig = skillSetSignature(equipped)
  const hit = _bySet.get(sig)
  if (hit) return hit
  const ws = new Workspace({
    filesystem: buildComposite(),
    skills: resolveSkillPaths(equipped), 
    bm25: true,
    tools: { enabled: false },
  })
  void ws.init().catch((err) => console.warn('[skills] init() subconjunto falhou (não-fatal):', (err as Error).message))
  _bySet.set(sig, ws)
  return ws
}


export function _resetSkillsWorkspace(): void {
  _cached = null
  _initPromise = null
  _bySet.clear()
}
