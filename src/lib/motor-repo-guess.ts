




export interface RepoLike {
  fullName: string
}


function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '')
}


function repoName(fullName: string): string {
  const i = fullName.indexOf('/')
  return (i >= 0 ? fullName.slice(i + 1) : fullName).toLowerCase()
}

const MOTOR_HINT = /awave|agents|motor|empresa/


export function guessMotorRepo(repos: RepoLike[], brainRepo: string | null): string | null {
  const brain = brainRepo ? normalizeSlug(brainRepo) : null
  const candidates = repos.filter((r) => normalizeSlug(r.fullName) !== brain)
  if (candidates.length === 0) return null
  const byName = candidates.find((r) => MOTOR_HINT.test(repoName(r.fullName)))
  return (byName ?? candidates[0]).fullName
}
