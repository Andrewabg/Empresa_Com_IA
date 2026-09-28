import matter from 'gray-matter'
import { z } from 'zod'

export const FrontmatterSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  type: z.enum(['semantic', 'episodic', 'procedural']).default('semantic'),
  tags: z.array(z.string()).default([]),
  source: z.string().optional(),
  author_agent: z.string().optional(),
  confidence: z.number().min(0).max(1).default(0.5),
  links: z.array(z.string()).default([]),
})
export type Frontmatter = z.infer<typeof FrontmatterSchema>
export type Note = Frontmatter & { path: string; body: string }

export function parseNote(path: string, raw: string): Note {
  const { data, content } = matter(raw)
  const fm = FrontmatterSchema.parse(data)
  return { ...fm, path, body: content.trim() }
}

export function serializeNote(note: Note): string {
  const { path, body, ...fm } = note
  
  const clean = Object.fromEntries(Object.entries(fm).filter(([, v]) => v !== undefined))
  return matter.stringify(body, clean)
}
