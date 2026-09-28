
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'
import simpleGit from 'simple-git'
import type { ApplyResult } from '../../brain/curator/commit'
import { withCloneLock } from './cloneLock'
import { reconcileResilient } from './reconcileResilient'
import { registrarPrDoCerebro } from './aprovacoesDoCerebro'
import { getBrain } from './runtime'
import { isSafeNotePath } from '@/lib/brain/safePath'
import {
  caminhoArquivado,
  estaArquivada,
  AVISO_CAMINHO_INVALIDO,
  AVISO_JA_ARQUIVADA,
  AVISO_NAO_ENCONTRADA,
  AVISO_NAO_ARQUIVOU,
  AVISO_DESTINO_OCUPADO,
  AVISO_ERRO_AO_ARQUIVAR,
} from '@/lib/brain/arquivoDeNotas'

type Brain = Awaited<ReturnType<typeof getBrain>>

export interface ArquivarNotaResult {
  ok: boolean
  
  destino?: string
  
  motivo?: string
  
  indice_atrasado?: true
}


export async function arquivarNota(path: string, brain?: Brain): Promise<ArquivarNotaResult> {
  
  
  if (!isSafeNotePath(path) || !path.endsWith('.md')) {
    return { ok: false, motivo: AVISO_CAMINHO_INVALIDO }
  }
  
  if (estaArquivada(path)) return { ok: false, motivo: AVISO_JA_ARQUIVADA }

  const b = brain ?? (await getBrain())

  return withCloneLock(async () => {
    
    
    await b.repo.pull()

    try {
      b.repo.readNote(path)
    } catch {
      
      return { ok: false, motivo: AVISO_NAO_ENCONTRADA }
    }

    const destino = caminhoArquivado(path)
    const git = simpleGit(b.repo.dir)
    
    
    
    mkdirSync(dirname(join(b.repo.dir, destino)), { recursive: true })

    let aplicado: ApplyResult
    try {
      
      
      
      
      
      
      
      
      await git.raw(['mv', '--', path, destino])
      
      
      
      
      aplicado = await b.committer.commitFile(destino, `chore(cerebro): arquiva ${path}`)
    } catch (err) {
      
      
      
      
      
      
      
      const destinoOcupado = err instanceof Error && /destination exists/i.test(err.message)
      console.warn('[arquivarNota] git mv/commit falhou, revertendo o clone:', err)
      try {
        await git.reset(['--hard', 'HEAD'])
      } catch (resetErr) {
        
        
        
        
        
        console.error('[arquivarNota] reset --hard HEAD falhou depois de um git mv malsucedido:', resetErr)
      }
      return { ok: false, motivo: destinoOcupado ? AVISO_DESTINO_OCUPADO : AVISO_ERRO_AO_ARQUIVAR }
    }

    if (aplicado.kind !== 'commit') {
      
      
      
      
      
      
      
      if (aplicado.kind === 'pr') {
        await registrarPrDoCerebro({ path, titulo: `Arquivar "${path}"`, ref: aplicado.ref })
      }
      return { ok: false, motivo: AVISO_NAO_ARQUIVOU }
    }

    try {
      await reconcileResilient(b.db, b.repo, b.sync, b.embedder.version())
    } catch (err) {
      
      
      
      console.warn('[arquivarNota] reindexação falhou (o commit já subiu):', err)
      return { ok: true, destino, indice_atrasado: true }
    }

    return { ok: true, destino }
  })
}
