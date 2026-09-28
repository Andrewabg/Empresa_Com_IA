


export function skillSetSignature(slugs: string[]): string {
  return [...new Set(slugs)].sort().join('|')
}


export function sameSkillSet(a: string[], b: string[]): boolean {
  return skillSetSignature(a) === skillSetSignature(b)
}
