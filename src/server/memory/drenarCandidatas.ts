
import { serverDb } from '@/server/supabase'
import { pendingCandidates } from '@/brain/curator/candidates'
import { getBrain as getBrainDefault, type Brain } from '@/server/brain/runtime'
import { marcarInelegiveisComoDescartadas, portaoFechou, type ResultadoDoPortao } from '@/server/brain/candidatasElegiveis'
import type { RecusaDeOrigem } from '@/lib/memory/avisoDeOrigemRecusada'


export const LOTE_DE_DRENO = 20

export interface DrenarDeps {
  contarPendentes?: () => Promise<number>
  getBrain?: () => Promise<Brain>
  
  marcarInelegiveis?: () => Promise<ResultadoDoPortao>
  
  criarAprovacoes?: () => Promise<number>
}

export interface DrenarResultado {
  drenadas: number
  
  falhou: boolean
  
  portaoFalhou: boolean
  
  recusas: RecusaDeOrigem[]
}

export async function drenarCandidatas(
  deps: DrenarDeps = {},
): Promise<DrenarResultado> {
  const contar = deps.contarPendentes ?? (async () => {
    const { data, error } = await pendingCandidates(serverDb())
    if (error) throw new Error(error.message)
    return data?.length ?? 0
  })
  const marcarInelegiveis = deps.marcarInelegiveis ?? (() => marcarInelegiveisComoDescartadas(serverDb()))

  let pendentesAntes = 0
  try {
    pendentesAntes = await contar()
  } catch (e) {
    console.warn('[drenarCandidatas] contagem fail-open:', e)
    return { drenadas: 0, falhou: true, portaoFalhou: false, recusas: [] }
  }
  
  
  if (pendentesAntes === 0) return { drenadas: 0, falhou: false, portaoFalhou: false, recusas: [] }

  
  
  
  let recusas: RecusaDeOrigem[] = []
  try {
    const portao = await marcarInelegiveis()
    recusas = portao.recusas
    
    
    
    
    if (!portaoFechou(portao)) {
      console.warn(
        `[drenarCandidatas] portão de origem NÃO fechou (leu=${portao.leu}, ${portao.marcadas} de ` +
        `${portao.recusas.length} marcadas): ` +
        'o dreno desta passada não roda para o Curador não consumir a inelegível que sobrou.',
      )
      return { drenadas: 0, falhou: true, portaoFalhou: true, recusas }
    }
  } catch (e) {
    console.warn('[drenarCandidatas] portão de origem falhou; o dreno desta passada NÃO roda:', e)
    return { drenadas: 0, falhou: true, portaoFalhou: true, recusas: [] }
  }

  try {
    
    
    
    
    
    const pendentesAposPortao = await contar()
    
    
    
    if (pendentesAposPortao === 0) return { drenadas: 0, falhou: false, portaoFalhou: false, recusas }

    
    
    
    
    
    
    
    
    
    const ponte = async () => {
      try {
        await (deps.criarAprovacoes ?? (async () =>
          (await import('@/server/brain/aprovacoesDoCerebro')).criarAprovacoesDePrOrfaos(serverDb())))()
      } catch (e) {
        console.warn('[drenarCandidatas] ponte PR → aprovações falhou (a consolidação diária tenta de novo):', e)
      }
    }
    await ponte()
    const brain = await (deps.getBrain ?? getBrainDefault)()
    await brain.curator.run()
    await ponte()
    
    
    
    const pendentesDepois = await contar()
    return { drenadas: Math.max(0, pendentesAposPortao - pendentesDepois), falhou: false, portaoFalhou: false, recusas }
  } catch (e) {
    console.warn('[drenarCandidatas] dreno fail-open (contagem ou Curador):', e)
    return { drenadas: 0, falhou: true, portaoFalhou: false, recusas }
  }
}
