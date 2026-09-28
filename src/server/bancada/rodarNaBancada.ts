









import { Worker } from 'node:worker_threads'
import path from 'node:path'
import { ERRO_INTERROMPIDO, ERRO_PRAZO, PRAZO_DA_CONSULTA_MS, type EntradaDoWorker, type SaidaDoWorker } from '@/lib/bancada/tipos'

const CAMINHO_PADRAO = () => path.join(process.cwd(), 'bancada-worker.mjs')

export function rodarNaBancada(
  entrada: EntradaDoWorker,
  opts: { prazoMs?: number; caminhoDoWorker?: string; signal?: AbortSignal } = {},
): Promise<SaidaDoWorker> {
  const prazoMs = opts.prazoMs ?? PRAZO_DA_CONSULTA_MS
  const caminho = opts.caminhoDoWorker ?? CAMINHO_PADRAO()
  return new Promise<SaidaDoWorker>((resolve) => {
    let resolvido = false
    
    
    
    const solto = new AbortController()
    const entregar = (s: SaidaDoWorker) => { if (!resolvido) { resolvido = true; solto.abort(); resolve(s) } }
    
    
    
    if (opts.signal?.aborted) { entregar({ ok: false, erro: ERRO_INTERROMPIDO }); return }
    let w: Worker
    try {
      
      
      w = new Worker(caminho, { workerData: entrada, resourceLimits: { maxOldGenerationSizeMb: 256 } })
    } catch (e: unknown) {
      entregar({ ok: false, erro: e instanceof Error ? e.message : String(e) })
      return
    }
    
    let mortePor: typeof ERRO_PRAZO | typeof ERRO_INTERROMPIDO | null = null
    const matar = (causa: typeof ERRO_PRAZO | typeof ERRO_INTERROMPIDO) => { mortePor = causa; void w.terminate() }
    const timer = setTimeout(() => matar(ERRO_PRAZO), prazoMs)
    
    
    opts.signal?.addEventListener('abort', () => matar(ERRO_INTERROMPIDO), { once: true, signal: solto.signal })
    w.once('message', (m: SaidaDoWorker) => { clearTimeout(timer); entregar(m) })
    w.once('error', (e: unknown) => { clearTimeout(timer); entregar({ ok: false, erro: e instanceof Error ? e.message : String(e) }) })
    w.once('exit', (code) => {
      clearTimeout(timer)
      if (mortePor) entregar({ ok: false, erro: mortePor })
      else if (code !== 0) entregar({ ok: false, erro: `worker saiu com codigo ${code}` })
      else entregar({ ok: false, erro: 'worker terminou sem responder' })
    })
  })
}
