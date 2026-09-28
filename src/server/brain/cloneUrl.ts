
export function cloneUrl(repoSlug: string, token: string): string {
  return `https://x-access-token:${token}@github.com/${repoSlug}.git`
}
