
import { proporMemoria, type ProporMemoriaDeps, type ProporMemoriaInput, type ProporMemoriaResult } from '../tools/proporMemoria'
import { ehFato, slugFato, type FatoEmpresa } from '@/lib/memory/fichaEmpresa'
import { upsertFatoEmpresa as defaultUpsertFatoEmpresa } from '@/data/fichaEmpresa'
import type { getBrain } from '../brain/runtime'

type Brain = Awaited<ReturnType<typeof getBrain>>


export interface RegisterMemoryDeps {
  upsertFatoEmpresa?: (fato: FatoEmpresa) => Promise<void>
  propor?: (input: ProporMemoriaInput, brain?: Brain, deps?: ProporMemoriaDeps) => Promise<ProporMemoriaResult>
  now?: () => string
}

export async function registerMemory(
  input: ProporMemoriaInput,
  brain?: Brain,
  deps?: RegisterMemoryDeps,
): Promise<ProporMemoriaResult> {
  const upsertFatoEmpresa = deps?.upsertFatoEmpresa ?? defaultUpsertFatoEmpresa
  const propor = deps?.propor ?? proporMemoria
  const now = deps?.now ?? (() => new Date().toISOString())

  
  
  if (ehFato(input.tipo)) {
    try {
      await upsertFatoEmpresa({
        id: slugFato(input.título),
        rotulo: input.título,
        valor: input.conteúdo,
        
        
        
        
        
        fonte: 'operador',
        at: now(),
      })
    } catch (err) {
      console.warn('[registerMemory] gravação na Ficha falhou (não-fatal):', err)
    }
  }

  
  
  
  
  
  return propor(input, brain, { origem: 'dono' })
}
