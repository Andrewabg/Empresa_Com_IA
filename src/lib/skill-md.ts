


const MAX_SLUG_LEN = 64


export function slugifySkillName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') 
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LEN)
}


export function validateSkillSlug(slug: string): boolean {
  return slug.length >= 1 && slug.length <= MAX_SLUG_LEN && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)
}

export interface SerializeSkillMdInput {
  
  name: string
  
  description: string
  
  instructions: string
}


export function serializeSkillMd({ name, description, instructions }: SerializeSkillMdInput): string {
  return `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\n---\n\n${instructions}\n`
}
