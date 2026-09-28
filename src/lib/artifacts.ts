

export const ARTIFACT_KINDS = ['documento', 'html', 'codigo', 'dados', 'imagem'] as const
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number]

export function isArtifactKind(v: unknown): v is ArtifactKind {
  return typeof v === 'string' && (ARTIFACT_KINDS as readonly string[]).includes(v)
}


export const ARTIFACT_SCHEMA_REVISION = 'rev_3x1fj577a50s4lkakjw9ma' as const


export function isInlineKind(kind: ArtifactKind): boolean {
  return kind !== 'imagem'
}

const EXT: Record<ArtifactKind, string> = {
  documento: 'md',
  html: 'html',
  codigo: 'txt',
  dados: 'json',
  imagem: 'png',
}
export function artifactExtension(kind: ArtifactKind): string {
  return EXT[kind]
}

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 48)
    .replace(/^-+|-+$/g, '')
}

export function artifactFilename(title: string, kind: ArtifactKind): string {
  const base = slugify(title) || 'artefato'
  return `${base}.${artifactExtension(kind)}`
}


export const ANEXO_PREFIX = 'anexos/'


export function isAnexoDeConversa(artifact?: { storage_ref?: string | null } | null): boolean {
  return typeof artifact?.storage_ref === 'string' && artifact.storage_ref.startsWith(ANEXO_PREFIX)
}


export function prettyJsonOrRaw(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}