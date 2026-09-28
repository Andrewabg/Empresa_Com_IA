
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { getModeloDaCasa as getModeloDaCasaImpl } from '@/data/contratos'
import { getModeloFabrica } from '@/lib/juridico/modelosFabrica'

export interface LerModeloBaseDeps {
  getModeloDaCasa?: typeof getModeloDaCasaImpl
  lerStarter?: (skillSlug: string) => Promise<string | null>
}

async function defaultLerStarter(skillSlug: string): Promise<string | null> {
  try {
    return await fs.readFile(path.join(process.cwd(), 'skills', skillSlug, 'SKILL.md'), 'utf-8')
  } catch { return null }
}


export async function lerModeloBase(
  operatorId: string, tipo: string, deps: LerModeloBaseDeps = {},
): Promise<{ fonte: 'casa' | 'starter' | 'nenhum'; texto: string }> {
  const getCasa = deps.getModeloDaCasa ?? getModeloDaCasaImpl
  const lerStarter = deps.lerStarter ?? defaultLerStarter
  try {
    const casa = await getCasa(operatorId, tipo)
    if (casa?.texto) return { fonte: 'casa', texto: casa.texto }
  } catch (e) { console.warn('[lerModeloBase] casa falhou (fail-open):', e) }
  const fabrica = getModeloFabrica(tipo)
  if (fabrica) {
    const starter = await lerStarter(fabrica.skillSlug)
    if (starter) return { fonte: 'starter', texto: starter }
  }
  return { fonte: 'nenhum', texto: '' }
}
