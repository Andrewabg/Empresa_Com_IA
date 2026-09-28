
import { hashPrompt } from '@/lib/persona-hash'


export const HASHES_PERSONA_DE_FABRICA: readonly string[] = [
  'aecb01c205963692', 
  '339eb58fa058273f', 
  '9c521aa5287f4992', 
  '57fe76c94f493851', 
  'aa0a4e4f56988d5f',
  '32d1109954833e3d',
  'f39927d4643d57c9',
  'b6e8c6b99af4a4f5',
  '810906d03679c8ef',
  '6c4f681f9bab92fa',
  '2e3848bbe61efbd9',
  '162cafd6bdbe3a87',
  'd786bbda9576c41a',
  '631e1b1a41cdbc8f',
  '9108272a0fe19661',
]


export function ehPersonaDeFabrica(texto: string, lista: readonly string[] = HASHES_PERSONA_DE_FABRICA): boolean {
  return lista.includes(hashPrompt(texto))
}
