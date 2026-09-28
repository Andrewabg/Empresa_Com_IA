


const BOILERPLATE_BASENAMES = new Set([
  'readme.md', 'license.md', 'licence.md', 'contributing.md', 'changelog.md',
  'code_of_conduct.md', 'security.md', 'authors.md', 'notice.md', 'support.md',
  'agents.md', 'claude.md',
])


export function isBoilerplateMarkdown(path: string): boolean {
  const base = (path.split('/').pop() ?? '').toLowerCase()
  return BOILERPLATE_BASENAMES.has(base)
}
