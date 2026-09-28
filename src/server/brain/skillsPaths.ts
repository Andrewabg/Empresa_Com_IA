
import { tmpdir } from 'node:os'
import { join } from 'node:path'


export function cloneDir(): string {
  return process.env.BRAIN_CLONE_DIR ?? join(tmpdir(), 'awave-brain')
}


export function liveSkillsDir(): string {
  return `${cloneDir()}-skills-live`
}
