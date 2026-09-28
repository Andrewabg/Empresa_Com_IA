
export type ModoAcao = 'read' | 'direto' | 'hitl'
export type AcaoModes = Record<string, 'hitl' | 'direto'>
export type ClassifyFn = (slug: string) => 'read' | 'write'


export function modoDaAcao(
  slug: string, toolkit: string | null,
  modes: AcaoModes | null | undefined, classify: ClassifyFn,
): ModoAcao {
  if (classify(slug) === 'read') return 'read'
  const tk = (toolkit ?? slug.split('_')[0]).toLowerCase()
  if (!modes) return 'hitl'
  const norm: Record<string, string> = {}
  for (const [k, v] of Object.entries(modes)) norm[k.toLowerCase()] = v
  return norm[tk] === 'direto' ? 'direto' : 'hitl'
}
