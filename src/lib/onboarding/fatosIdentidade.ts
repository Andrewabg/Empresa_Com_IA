
import { slugFato, type FatoEmpresa } from '@/lib/memory/fichaEmpresa'


export const ROTULOS_IDENTIDADE = {
  companyName: 'Empresa',
  operatorName: 'Dono',
  mission: 'Missão',
  voiceTone: 'Tom de voz',
} as const

export type CampoIdentidade = keyof typeof ROTULOS_IDENTIDADE


export type IdentidadeParcial = Partial<Record<CampoIdentidade, string | undefined>>


const ORDEM: readonly CampoIdentidade[] = ['companyName', 'operatorName', 'mission', 'voiceTone']


export function fatosDeIdentidade(identidade: IdentidadeParcial, at: string): FatoEmpresa[] {
  const fatos: FatoEmpresa[] = []
  for (const campo of ORDEM) {
    const valor = (identidade[campo] ?? '').trim()
    if (!valor) continue
    const rotulo = ROTULOS_IDENTIDADE[campo]
    fatos.push({ id: slugFato(rotulo), rotulo, valor, categoria: 'dados', fonte: 'operador', at })
  }
  return fatos
}
