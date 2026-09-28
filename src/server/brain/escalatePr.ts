
import simpleGit from 'simple-git'
import type { Octokit } from '@octokit/rest'

export interface OpenPrOpts {
  dir: string
  path: string
  message: string
  octokit?: Octokit
  repoSlug?: string
  branchSuffix?: () => string
  gitEmail?: string
  gitName?: string
}


export async function openPrForPath(opts: OpenPrOpts): Promise<{ kind: 'pr'; ref?: string }> {
  const git = simpleGit(opts.dir)
  await git.addConfig('user.email', opts.gitEmail ?? 'brain@awave.ai').addConfig('user.name', opts.gitName ?? 'Awave Brain')
  const suffix = (opts.branchSuffix ?? (() => String(Date.now())))()
  const branch = `curator/${suffix}-${opts.path.replace(/\W+/g, '-')}`
  await git.checkoutLocalBranch(branch)
  let ref: string | undefined = branch
  try {
    await git.add(opts.path).commit(`brain: ${opts.message}`)
    await git.push(['-u', 'origin', branch])
    if (opts.octokit && opts.repoSlug) {
      const [owner, repo] = opts.repoSlug.split('/')
      const pr = await opts.octokit.pulls.create({ owner, repo, head: branch, base: 'main', title: `[brain] ${opts.message}` })
      ref = pr.data.html_url
    }
  } finally {
    
    
    await git.checkout('main')
  }
  return { kind: 'pr', ref }
}
