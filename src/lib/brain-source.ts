







export interface SourceCandidate {
  source_type: string
  source_ref: string | null
}


export type ImportFilenames = Record<string, string[]>


export function sourceLabel(c: SourceCandidate, filenames: ImportFilenames): string | undefined {
  const ref = c.source_ref ?? undefined
  if (c.source_type === 'import') {
    if (ref) {
      const files = filenames[ref] ?? []
      return files.length > 0 ? `import:${files.join(', ')}` : `import:${ref}`
    }
    return 'import'
  }
  if (c.source_type) {
    return ref ? `${c.source_type}:${ref}` : c.source_type
  }
  return undefined
}
