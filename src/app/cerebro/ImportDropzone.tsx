'use client'



import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { useReducedMotion } from '@/lib/motion'
import { ACCEPT_ATTR, canSubmitImport, capsLabel, validateUpload } from '@/lib/imports/upload'
import { adapterFor } from '@/lib/imports/dispatch'
import {
  shouldPoll,
  viewImport,
  type ImportApiResponse,
  type ImportCandidateView,
  type ImportView,
} from '@/lib/imports/progress'
import type { ImageQueueItem } from '@/lib/imports/imageQueueView'
import { prunarSelecao, selecionarTodos, toggleSelecao } from '@/lib/imports/reviewTriage'
import ReviewList from '@/app/cerebro/ReviewList'



const POLL_MS = 3000


const SUCCESS_VAR = 'var(--approve)'
const ERROR_VAR = 'var(--reject)'

const WAVE_GRADIENT = 'linear-gradient(120deg, var(--wave-from), var(--wave-to))'

type Phase = 'idle' | 'picking' | 'active'



export interface ImportDropzoneProps {
  
  onImported?: () => void
  
  target?: 'cerebro' | 'base'
  
  baseAgentId?: string
  
  storageKey?: string
}



function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  const kb = n / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  const mb = kb / 1024
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`
}



export default function ImportDropzone({
  onImported, target = 'cerebro', baseAgentId = '', storageKey = 'cerebro:activeImport',
}: ImportDropzoneProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [dragActive, setDragActive] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [ctxFocused, setCtxFocused] = useState(false)
  const [pasteFocused, setPasteFocused] = useState(false)
  
  
  const [triedSubmit, setTriedSubmit] = useState(false)
  
  const [nudgeTick, setNudgeTick] = useState(0)

  
  
  const [context, setContext] = useState('')
  const [staged, setStaged] = useState<File[]>([])
  const [pasted, setPasted] = useState('')

  const [importId, setImportId] = useState<string | null>(null)
  const [rawStatus, setRawStatus] = useState<string | null>(null)
  const [view, setView] = useState<ImportView | null>(null)
  
  const [contextShown, setContextShown] = useState<string | null>(null)

  
  const [undoing, setUndoing] = useState(false)
  const [undoErr, setUndoErr] = useState<string | null>(null)

  
  
  
  const [emAcao, setEmAcao] = useState<Set<number>>(new Set())
  
  const [sel, setSel] = useState<Set<number>>(new Set())
  
  const maxRestantesRef = useRef(0)
  
  const [busyAll, setBusyAll] = useState(false)
  
  const [reviewErr, setReviewErr] = useState<string | null>(null)
  
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitulo, setEditTitulo] = useState('')
  const [editCorpo, setEditCorpo] = useState('')

  
  
  const [imgUrls, setImgUrls] = useState<Record<number, string>>({})
  
  const [imgBusy, setImgBusy] = useState<number | null>(null)
  
  const [imgErr, setImgErr] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement | null>(null)
  const ctxRef = useRef<HTMLTextAreaElement | null>(null)
  const pasteRef = useRef<HTMLTextAreaElement | null>(null)
  const importedFiredRef = useRef(false)

  const reduceMotionRaw = useReducedMotion()
  const reduceMotion = reduceMotionRaw === true

  
  const resetToIdle = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
    } catch {
      
    }
    setImportId(null)
    setRawStatus(null)
    setView(null)
    setContextShown(null)
    setWarning(null)
    setError(null)
    setUploading(false)
    setUndoing(false)
    setUndoErr(null)
    
    setEmAcao(new Set())
    setSel(new Set())
    maxRestantesRef.current = 0
    setBusyAll(false)
    setReviewErr(null)
    setEditingId(null)
    
    setImgUrls({})
    setImgBusy(null)
    setImgErr(null)
    
    setContext('')
    setStaged([])
    setPasted('')
    setTriedSubmit(false)
    importedFiredRef.current = false
    setPhase('idle')
  }, [storageKey])

  
  const backToPicking = useCallback(() => {
    setImportId(null)
    setRawStatus(null)
    setView(null)
    setContextShown(null)
    setUploading(false)
    setTriedSubmit(false)
    
    setEmAcao(new Set())
    setSel(new Set())
    maxRestantesRef.current = 0
    setBusyAll(false)
    setReviewErr(null)
    setEditingId(null)
    
    setImgUrls({})
    setImgBusy(null)
    setImgErr(null)
    importedFiredRef.current = false
    
    setPhase('picking')
  }, [])

  
  
  
  
  const handleUndo = useCallback(async () => {
    if (!importId || undoing) return
    setUndoing(true)
    setUndoErr(null)
    try {
      const res = await fetch(`/api/cerebro/import/${importId}/undo`, { method: 'POST' })
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; reverted?: number; reason?: string; error?: string }
        | null

      if (res.ok && data?.ok) {
        
        
        
        try {
          localStorage.removeItem(storageKey)
        } catch {
          
        }
        onImported?.()
        try {
          const check = await fetch(`/api/cerebro/import/${importId}`)
          if (check.ok) {
            const resp = (await check.json()) as ImportApiResponse
            setRawStatus(resp.status)
            setView(viewImport(resp))
          }
        } catch {
          
        }
        setUndoing(false)
        return
      }

      
      
      setUndoErr(data?.error || 'Não consegui desfazer agora. Tente de novo.')
      setUndoing(false)
    } catch {
      setUndoErr('Não consegui desfazer agora. Tente de novo.')
      setUndoing(false)
    }
  }, [importId, undoing, onImported, storageKey])

  
  
  
  
  const refetch = useCallback(async () => {
    if (!importId) return
    try {
      const res = await fetch(`/api/cerebro/import/${importId}`)
      if (!res.ok) return
      const resp = (await res.json()) as ImportApiResponse
      const respCtx = (resp as { context?: string | null }).context
      if (respCtx != null && respCtx.trim().length > 0) setContextShown(respCtx)
      setRawStatus(resp.status)
      setView(viewImport(resp))
    } catch {
      
    }
  }, [importId])

  
  
  
  
  useEffect(() => {
    const ids = (view?.candidates ?? []).map(c => c.id)
    maxRestantesRef.current = Math.max(maxRestantesRef.current, ids.length)
    setSel(s => prunarSelecao(s, ids))
  }, [view])

  
  
  

  const approveCandidato = useCallback(
    async (cid: number) => {
      if (!importId || emAcao.has(cid)) return
      setEmAcao(s => new Set(s).add(cid))
      setReviewErr(null)
      try {
        const res = await fetch(`/api/cerebro/import/${importId}/candidates/${cid}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve' }),
        })
        if (!res.ok) throw new Error('falhou')
        setSel(s => {
          const n = new Set(s)
          n.delete(cid)
          return n
        })
        await refetch()
      } catch {
        setReviewErr('Não consegui aprovar. Tente de novo.')
      } finally {
        setEmAcao(s => {
          const n = new Set(s)
          n.delete(cid)
          return n
        })
      }
    },
    [importId, emAcao, refetch],
  )

  const rejectCandidato = useCallback(
    async (cid: number) => {
      if (!importId || emAcao.has(cid)) return
      setEmAcao(s => new Set(s).add(cid))
      setReviewErr(null)
      try {
        const res = await fetch(`/api/cerebro/import/${importId}/candidates/${cid}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject' }),
        })
        if (!res.ok) throw new Error('falhou')
        setSel(s => {
          const n = new Set(s)
          n.delete(cid)
          return n
        })
        await refetch()
      } catch {
        setReviewErr('Não consegui descartar. Tente de novo.')
      } finally {
        setEmAcao(s => {
          const n = new Set(s)
          n.delete(cid)
          return n
        })
      }
    },
    [importId, emAcao, refetch],
  )

  const saveEdit = useCallback(
    async (cid: number, titulo: string, corpo: string) => {
      if (!importId || busyAll || emAcao.has(cid)) return
      setEmAcao(s => new Set(s).add(cid))
      setReviewErr(null)
      try {
        const res = await fetch(`/api/cerebro/import/${importId}/candidates/${cid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ titulo, corpo }),
        })
        if (!res.ok) throw new Error('falhou')
        setEditingId(null)
        await refetch()
      } catch {
        setReviewErr('Não consegui salvar. Tente de novo.')
      } finally {
        setEmAcao(s => {
          const n = new Set(s)
          n.delete(cid)
          return n
        })
      }
    },
    [importId, busyAll, emAcao, refetch],
  )

  const approveAll = useCallback(async () => {
    if (!importId || busyAll || emAcao.size > 0) return
    setBusyAll(true)
    setReviewErr(null)
    try {
      const res = await fetch(`/api/cerebro/import/${importId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_all' }),
      })
      if (!res.ok) throw new Error('falhou')
      setSel(new Set())
      await refetch()
    } catch {
      setReviewErr('Não consegui aprovar todos. Tente de novo.')
    } finally {
      setBusyAll(false)
    }
  }, [importId, busyAll, emAcao, refetch])

  const rejectAll = useCallback(async () => {
    if (!importId || busyAll || emAcao.size > 0) return
    setBusyAll(true)
    setReviewErr(null)
    try {
      const res = await fetch(`/api/cerebro/import/${importId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject_all' }),
      })
      if (!res.ok) throw new Error('falhou')
      setSel(new Set())
      await refetch()
    } catch {
      setReviewErr('Não consegui descartar todos. Tente de novo.')
    } finally {
      setBusyAll(false)
    }
  }, [importId, busyAll, emAcao, refetch])

  
  const approveSelecionados = useCallback(async () => {
    if (!importId || busyAll || emAcao.size > 0 || sel.size === 0) return
    setBusyAll(true)
    setReviewErr(null)
    try {
      const res = await fetch(`/api/cerebro/import/${importId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_selected', ids: [...sel] }),
      })
      if (!res.ok) throw new Error('falhou')
      setSel(new Set())
      await refetch()
    } catch {
      setReviewErr('Não consegui aprovar os selecionados. Tente de novo.')
    } finally {
      setBusyAll(false)
    }
  }, [importId, busyAll, emAcao, sel, refetch])

  const rejeitarSelecionados = useCallback(async () => {
    if (!importId || busyAll || emAcao.size > 0 || sel.size === 0) return
    setBusyAll(true)
    setReviewErr(null)
    try {
      const res = await fetch(`/api/cerebro/import/${importId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject_selected', ids: [...sel] }),
      })
      if (!res.ok) throw new Error('falhou')
      setSel(new Set())
      await refetch()
    } catch {
      setReviewErr('Não consegui descartar os selecionados. Tente de novo.')
    } finally {
      setBusyAll(false)
    }
  }, [importId, busyAll, emAcao, sel, refetch])

  
  
  
  const acaoImagem = useCallback(
    async (n: number, acao: 'ler' | 'descartar') => {
      if (!importId) return
      setImgBusy(n)
      setImgErr(null)
      try {
        const res = await fetch(`/api/cerebro/import/${importId}/images/${n}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ acao }),
        })
        if (!res.ok) {
          setImgErr('Não consegui atualizar a imagem. Tente de novo.')
          return
        }
        await refetch()
      } catch {
        setImgErr('Não consegui atualizar a imagem. Tente de novo.')
      } finally {
        setImgBusy(null)
      }
    },
    [importId, refetch],
  )

  
  
  
  useEffect(() => {
    if (!importId || !view?.imagens) return
    const alvos = view.imagens.filter(
      img => (img.status === 'pending' || img.status === 'failed') && !(img.n in imgUrls),
    )
    if (alvos.length === 0) return

    let cancelled = false
    ;(async () => {
      for (const img of alvos) {
        try {
          const res = await fetch(`/api/cerebro/import/${importId}/images/${img.n}`)
          if (cancelled) return
          if (!res.ok) continue
          const data = (await res.json().catch(() => null)) as { url?: string } | null
          if (cancelled) return
          if (data?.url) setImgUrls(prev => ({ ...prev, [img.n]: data.url as string }))
        } catch {
          
        }
      }
    })()

    return () => {
      cancelled = true
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.imagens, importId])

  
  const uploadFiles = useCallback(
    async (supported: File[], noteContext: string) => {
      setUploading(true)
      setError(null)
      const form = new FormData()
      for (const f of supported) form.append('file', f)
      
      form.append('context', noteContext)
      form.append('target', target)
      if (target === 'base') form.append('baseAgentId', baseAgentId)

      try {
        const res = await fetch('/api/cerebro/import', { method: 'POST', body: form })
        const data = (await res.json().catch(() => null)) as
          | {
              importId?: string
              error?: string
              skipped?: { filename: string; reason: string }[]
              falhas?: { filename: string; reason: string }[]
            }
          | null
        if (!res.ok || !data?.importId) {
          setError(data?.error || 'Falha ao enviar. Tente de novo.')
          setUploading(false)
          setPhase('picking')
          return
        }
        const id = data.importId
        try {
          localStorage.setItem(storageKey, id)
        } catch {
          
        }
        importedFiredRef.current = false
        
        
        const pulados = data.skipped ?? []
        
        
        const naoSubiram = data.falhas ?? []
        const avisos = [
          pulados.length === 0
            ? null
            : pulados.length === 1
              ? `Pulei "${pulados[0].filename}": arquivo idêntico já importado antes.`
              : `Pulei ${pulados.length} arquivos idênticos já importados antes.`,
          naoSubiram.length === 0
            ? null
            : naoSubiram.length === 1
              ? `Não consegui guardar "${naoSubiram[0].filename}". Tente enviar de novo.`
              : `Não consegui guardar ${naoSubiram.length} arquivos. Tente enviar de novo.`,
        ].filter(Boolean)
        setWarning(avisos.length === 0 ? null : avisos.join(' '))
        setError(null)
        setImportId(id)
        setRawStatus(null)
        setView(null)
        setUploading(false)
        setPhase('active')
      } catch {
        setError('Falha ao enviar. Tente de novo.')
        setUploading(false)
        setPhase('picking')
      }
    },
    [target, baseAgentId, storageKey],
  )

  
  
  const stageFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    if (files.length === 0) return

    setWarning(null)
    setError(null)

    
    const supported: File[] = []
    const unsupported: File[] = []
    for (const f of files) {
      if (adapterFor(f.type || null, f.name) !== 'unsupported') supported.push(f)
      else unsupported.push(f)
    }

    
    
    
    
    
    if (unsupported.length > 0) {
      const nomes = unsupported.map(f => f.name).join(', ')
      const temLegado = unsupported.some(f => /\.(xls|doc)$/i.test(f.name))
      const dicaLegado = temLegado
        ? ' Arquivos antigos .xls/.doc: abra no Office e salve como .xlsx/.docx.'
        : ''
      setWarning(
        `Ainda não leio: ${nomes}.${dicaLegado} Leio PDF, Word (.docx), texto/Markdown, planilha .csv/.xlsx e imagem (.png/.jpg).`,
      )
    }

    
    if (supported.length === 0) return
    setStaged(prev => {
      const seen = new Set(prev.map(f => `${f.name}:${f.size}`))
      const next = [...prev]
      for (const f of supported) {
        const key = `${f.name}:${f.size}`
        if (!seen.has(key)) {
          seen.add(key)
          next.push(f)
        }
      }
      return next
    })
  }, [])

  
  const removeStaged = useCallback((target: File) => {
    setStaged(prev => prev.filter(f => f !== target))
  }, [])

  
  
  
  
  const submit = useCallback(() => {
    setError(null)
    const noCtx = context.trim() === ''
    const pasteText = pasted.trim()
    
    const noStep2 = staged.length === 0 && pasteText === ''

    if (noCtx || noStep2) {
      setTriedSubmit(true)
      setNudgeTick(t => t + 1)
      
      if (noCtx) ctxRef.current?.focus()
      else pasteRef.current?.focus()
      return
    }

    
    
    const extras = pasteText
      ? [new File([pasteText], 'texto-colado.md', { type: 'text/markdown' })]
      : []
    const all = [...staged, ...extras]

    const check = validateUpload(all.map(f => ({ name: f.name, size: f.size })))
    if (!check.ok) {
      setError(check.error || 'Arquivos inválidos.')
      return
    }
    void uploadFiles(all, context)
  }, [staged, context, pasted, uploadFiles])

  
  const openPicker = useCallback(() => inputRef.current?.click(), [])

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      
      
      
      
      
      const files = e.target.files ? Array.from(e.target.files) : []
      e.target.value = ''
      if (files.length > 0) stageFiles(files)
    },
    [stageFiles],
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      const files = e.dataTransfer?.files
      if (files && files.length > 0) stageFiles(files)
    },
    [stageFiles],
  )

  const onZoneKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        openPicker()
      }
    },
    [openPicker],
  )

  
  
  
  
  useEffect(() => {
    if (phase !== 'active' || !importId) return
    
    if (rawStatus !== null && (!shouldPoll(rawStatus) || rawStatus === 'review')) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const tick = async () => {
      try {
        const res = await fetch(`/api/cerebro/import/${importId}`)
        if (cancelled) return

        if (res.status === 404) {
          
          resetToIdle()
          return
        }
        if (!res.ok) {
          
          timer = setTimeout(tick, POLL_MS)
          return
        }

        const resp = (await res.json()) as ImportApiResponse
        if (cancelled) return

        
        const respCtx = (resp as { context?: string | null }).context
        if (respCtx != null && respCtx.trim().length > 0) setContextShown(respCtx)

        setRawStatus(resp.status)
        setView(viewImport(resp))

        
        
        
        if (shouldPoll(resp.status) && resp.status !== 'review') {
          timer = setTimeout(tick, POLL_MS)
        }
      } catch {
        if (cancelled) return
        timer = setTimeout(tick, POLL_MS)
      }
    }

    void tick()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
    
    
    
  }, [phase, importId, rawStatus, resetToIdle])

  
  useEffect(() => {
    if (!view) return
    if (view.terminal && (view.tone === 'done' || view.tone === 'partial')) {
      if (!importedFiredRef.current) {
        importedFiredRef.current = true
        onImported?.()
      }
    }
  }, [view, onImported])

  
  useEffect(() => {
    let stored: string | null = null
    try {
      stored = localStorage.getItem(storageKey)
    } catch {
      stored = null
    }
    if (!stored) return

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/cerebro/import/${stored}`)
        if (cancelled) return
        if (res.status === 404 || !res.ok) {
          try {
            localStorage.removeItem(storageKey)
          } catch {
            
          }
          return
        }
        const resp = (await res.json()) as ImportApiResponse
        if (cancelled) return

        if (!shouldPoll(resp.status)) {
          
          try {
            localStorage.removeItem(storageKey)
          } catch {
            
          }
          return
        }
        
        const respCtx = (resp as { context?: string | null }).context
        if (respCtx != null && respCtx.trim().length > 0) setContextShown(respCtx)
        importedFiredRef.current = false
        setImportId(stored)
        setRawStatus(resp.status)
        setView(viewImport(resp))
        setPhase('active')
      } catch {
        
      }
    })()

    return () => {
      cancelled = true
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  

  
  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      multiple
      accept={ACCEPT_ATTR}
      hidden
      onChange={onInputChange}
    />
  )

  
  
  const dotKeyframes = (
    <style>{`
      @keyframes importDotPulse {
        0%, 100% { opacity: 0.35; }
        50% { opacity: 1; }
      }
    `}</style>
  )

  if (phase === 'active' && view) {
    
    if (view.review) {
      return (
        <div style={{ width: '100%' }}>
          {dotKeyframes}
          {hiddenInput}
          <ReviewList
            view={view}
            context={contextShown}
            reduceMotion={reduceMotion}
            emAcao={emAcao}
            busyAll={busyAll}
            sel={sel}
            onToggleSel={(id: number) => setSel(s => toggleSelecao(s, id))}
            onToggleTodos={() =>
              
              
              setSel(s =>
                selecionarTodos(
                  (view.candidates ?? []).filter(c => !emAcao.has(c.id)).map(c => c.id),
                  s,
                ),
              )
            }
            reviewErr={reviewErr}
            editingId={editingId}
            editTitulo={editTitulo}
            editCorpo={editCorpo}
            onStartEdit={(c: ImportCandidateView) => {
              setEditingId(c.id)
              setEditTitulo(c.titulo)
              setEditCorpo(c.corpo)
              setReviewErr(null)
            }}
            onCancelEdit={() => setEditingId(null)}
            onEditTituloChange={setEditTitulo}
            onEditCorpoChange={setEditCorpo}
            onSaveEdit={saveEdit}
            onApprove={approveCandidato}
            onReject={rejectCandidato}
            onApproveAll={approveAll}
            onRejectAll={rejectAll}
            onApproveSelected={approveSelecionados}
            onRejectSelected={rejeitarSelecionados}
            totalRevisao={maxRestantesRef.current}
            imagens={view.imagens}
            imgUrls={imgUrls}
            imgBusy={imgBusy}
            imgErr={imgErr}
            onImagemAcao={acaoImagem}
          />
        </div>
      )
    }

    return (
      <div style={{ width: '100%' }}>
        {dotKeyframes}
        {hiddenInput}
        <ProgressCard
          view={view}
          context={contextShown}
          reduceMotion={reduceMotion}
          onDispensar={resetToIdle}
          onRetry={backToPicking}
          onUndo={target === 'base' || rawStatus === 'undone' ? undefined : handleUndo}
          undoing={undoing}
          undoErr={undoErr}
        />
      </div>
    )
  }

  
  
  if (phase === 'active' && !view) {
    return (
      <div style={{ width: '100%' }}>
        {dotKeyframes}
        {hiddenInput}
        <PreparingCard reduceMotion={reduceMotion} />
      </div>
    )
  }

  if (phase === 'picking') {
    const pasteText = pasted.trim()
    const noContext = context.trim() === ''
    
    const noStep2 = staged.length === 0 && pasteText === ''
    const canSubmit = canSubmitImport(context, staged.length + (pasteText ? 1 : 0))
    
    const showContextError = triedSubmit && noContext
    const showStep2Error = triedSubmit && noStep2
    const errorHint = !triedSubmit
      ? null
      : noContext
        ? 'Preencha o passo 1 para ensinar'
        : noStep2
          ? 'No passo 2, anexe um documento ou cole o texto'
          : null

    
    const stagger = reduceMotion ? 0 : 0.06
    const reveal = (i: number) =>
      reduceMotion
        ? {}
        : {
            initial: { opacity: 0, y: 8 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.32, delay: i * stagger, ease: [0.22, 1, 0.36, 1] as const },
          }

    return (
      <div style={{ width: '100%' }}>
        {hiddenInput}
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 6 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={reduceMotion ? undefined : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            padding: '20px 20px 18px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-hairline)',
            background: 'var(--surface)',
          }}
        >
          {}
          <motion.div
            {...reveal(0)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}
            >
              Nova lição
            </span>
            <button
              type="button"
              aria-label="Fechar"
              onClick={resetToIdle}
              disabled={uploading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 26,
                height: 26,
                padding: 0,
                fontSize: 16,
                lineHeight: 1,
                color: 'var(--text-tertiary)',
                background: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: uploading ? 'default' : 'pointer',
                transition: 'color 140ms ease, background 140ms ease',
              }}
              onMouseEnter={e => {
                if (uploading) return
                e.currentTarget.style.color = 'var(--text-secondary)'
                e.currentTarget.style.background = 'var(--surface-elevated)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-tertiary)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              ×
            </button>
          </motion.div>

          {}
          <motion.div {...reveal(1)} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label
              htmlFor="import-context"
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}
            >
              <StepDot n={1} /> O que você quer que o Cérebro aprenda?
            </label>
            <textarea
              id="import-context"
              ref={ctxRef}
              value={context}
              onChange={e => setContext(e.target.value)}
              rows={3}
              disabled={uploading}
              aria-label="Descreva o que você quer ensinar ao Cérebro"
              placeholder="Ex.: nossa tabela de preços 2026 e a política de reembolso — quero que o time siga isso à risca."
              style={{
                width: '100%',
                resize: 'vertical',
                padding: '13px 15px',
                fontFamily: 'var(--font-ui)',
                fontSize: 14,
                lineHeight: 1.5,
                color: 'var(--text-primary)',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-hairline)',
                
                borderColor: showContextError
                  ? ERROR_VAR
                  : ctxFocused
                    ? 'color-mix(in srgb, var(--wave-to) 55%, var(--border-hairline))'
                    : 'var(--border-hairline)',
                
                boxShadow: showContextError
                  ? '0 0 0 3px color-mix(in srgb, var(--reject) 26%, transparent)'
                  : 'none',
                borderRadius: 'var(--radius-md)',
                outline: 'none',
                transition: 'border-color 160ms ease, box-shadow 160ms ease',
              }}
              onFocus={() => setCtxFocused(true)}
              onBlur={() => setCtxFocused(false)}
            />
          </motion.div>

          {}
          <motion.div {...reveal(2)} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}
            >
              <StepDot n={2} /> Os documentos que provam isso — ou cole o texto
            </span>
            <div
              role="button"
              tabIndex={0}
              aria-label="Arraste arquivos aqui ou clique para escolher — PDF, Word, texto, planilha ou imagem"
              aria-disabled={uploading}
              onClick={uploading ? undefined : openPicker}
              onKeyDown={uploading ? undefined : onZoneKeyDown}
              onDragOver={onDragOver}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '26px 20px',
                textAlign: 'center',
                cursor: uploading ? 'default' : 'pointer',
                borderRadius: 'var(--radius-lg)',
                
                border: dragActive
                  ? '1.5px dashed color-mix(in srgb, var(--wave-to) 70%, transparent)'
                  : showStep2Error
                    ? `1.5px dashed ${ERROR_VAR}`
                    : '1.5px dashed var(--border-hairline)',
                
                background: dragActive
                  ? 'linear-gradient(120deg, color-mix(in srgb, var(--wave-from) 9%, var(--surface)), color-mix(in srgb, var(--wave-to) 10%, var(--surface)))'
                  : 'var(--surface)',
                
                boxShadow:
                  showStep2Error && !dragActive
                    ? '0 0 0 3px color-mix(in srgb, var(--reject) 22%, transparent)'
                    : 'none',
                transition: 'border-color 140ms ease, background 140ms ease, box-shadow 160ms ease',
                outline: 'none',
              }}
            >
              <WaveIcon size={24} muted={!dragActive} />
              <div
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                }}
              >
                Arraste aqui ou clique para escolher
              </div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: 'var(--text-secondary)' }}>
                {capsLabel()}
              </div>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 11,
                color: 'var(--text-tertiary)',
                lineHeight: 1.4,
              }}
            >
              Leio por INTEIRO: PDF com texto, Word (.docx), texto, Markdown e planilhas (.csv/.xlsx). Escaneados e imagens (foto/print) leio por IA de visão — um escaneado longo consome mais (por ora leio até 40 páginas).
            </div>

            {}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border-hairline)' }} />
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-tertiary)' }}>
                ou cole o texto
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-hairline)' }} />
            </div>
            <textarea
              ref={pasteRef}
              value={pasted}
              onChange={e => setPasted(e.target.value)}
              rows={3}
              disabled={uploading}
              aria-label="Cole aqui o texto que quer ensinar ao Cérebro"
              placeholder="Cole ou escreva o conteúdo aqui — uma política, uma tabela de preços, um trecho…"
              style={{
                width: '100%',
                resize: 'vertical',
                padding: '13px 15px',
                fontFamily: 'var(--font-ui)',
                fontSize: 14,
                lineHeight: 1.5,
                color: 'var(--text-primary)',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-hairline)',
                
                borderColor: showStep2Error
                  ? ERROR_VAR
                  : pasteFocused
                    ? 'color-mix(in srgb, var(--wave-to) 55%, var(--border-hairline))'
                    : 'var(--border-hairline)',
                boxShadow: showStep2Error
                  ? '0 0 0 3px color-mix(in srgb, var(--reject) 26%, transparent)'
                  : 'none',
                borderRadius: 'var(--radius-md)',
                outline: 'none',
                transition: 'border-color 160ms ease, box-shadow 160ms ease',
              }}
              onFocus={() => setPasteFocused(true)}
              onBlur={() => setPasteFocused(false)}
            />
          </motion.div>

          {}
          {staged.length > 0 && (
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <AnimatePresence initial={false}>
                {staged.map((f, i) => (
                  <motion.li
                    key={`${f.name}:${f.size}:${i}`}
                    layout={!reduceMotion}
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.9, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      maxWidth: '100%',
                      padding: '6px 6px 6px 10px',
                      fontFamily: 'var(--font-ui)',
                      fontSize: 12,
                      color: 'var(--text-primary)',
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <FileGlyph />
                    <span
                      title={f.name}
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 200,
                      }}
                    >
                      {f.name}
                    </span>
                    <span
                      style={{
                        flex: '0 0 auto',
                        fontSize: 11,
                        color: 'var(--text-tertiary)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatBytes(f.size)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remover ${f.name}`}
                      onClick={() => removeStaged(f)}
                      disabled={uploading}
                      style={{
                        flex: '0 0 auto',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 18,
                        height: 18,
                        padding: 0,
                        fontFamily: 'var(--font-ui)',
                        fontSize: 13,
                        lineHeight: 1,
                        color: 'var(--text-tertiary)',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: uploading ? 'default' : 'pointer',
                        transition: 'color 120ms ease',
                      }}
                      onMouseEnter={e => {
                        if (!uploading) e.currentTarget.style.color = 'var(--text-secondary)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = 'var(--text-tertiary)'
                      }}
                    >
                      ×
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}

          {}
          {warning && <InlineNote tone="warning" text={warning} />}
          {error && <InlineNote tone="error" text={error} />}

          {}
          <div style={{ height: 1, background: 'var(--border-hairline)', margin: '0 -20px' }} />
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <Button variant="ghost" size="md" onClick={resetToIdle} disabled={uploading}>
              Cancelar
            </Button>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              {}
              {!uploading && errorHint && (
                <span
                  role="alert"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: 'var(--font-ui)',
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: ERROR_VAR,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      flex: '0 0 auto',
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: ERROR_VAR,
                    }}
                  />
                  {errorHint}
                </span>
              )}
              <TeachButton
                canSubmit={canSubmit}
                uploading={uploading}
                count={staged.length}
                reduceMotion={reduceMotion}
                onClick={submit}
                shakeSignal={nudgeTick}
              />
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  
  return (
    <div style={{ width: '100%' }}>
      <IdleInvite
        reduceMotion={reduceMotion}
        onOpen={() => {
          setWarning(null)
          setError(null)
          setPhase('picking')
        }}
      />
    </div>
  )
}



function IdleInvite({ reduceMotion, onOpen }: { reduceMotion: boolean; onOpen: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      initial={reduceMotion ? undefined : { opacity: 0, y: 4 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={reduceMotion ? undefined : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '16px 18px',
        cursor: 'pointer',
        textAlign: 'left',
        background: 'var(--surface)',
        border: '1px solid var(--border-hairline)',
        borderColor: hover
          ? 'color-mix(in srgb, var(--wave-to) 40%, var(--border-hairline))'
          : 'var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        transition: 'border-color 180ms ease',
      }}
    >
      {}
      <span
        aria-hidden="true"
        style={{
          flex: '0 0 auto',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: 'var(--radius-md)',
          background: hover
            ? 'linear-gradient(120deg, color-mix(in srgb, var(--wave-from) 16%, var(--surface-elevated)), color-mix(in srgb, var(--wave-to) 18%, var(--surface-elevated)))'
            : 'var(--surface-elevated)',
          border: '1px solid var(--border-hairline)',
          transition: 'background 180ms ease',
        }}
      >
        <WaveIcon size={20} muted={!hover} />
      </span>

      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: '1 1 auto' }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          Ensinar algo novo ao Cérebro
        </span>
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12.5,
            color: 'var(--text-secondary)',
            lineHeight: 1.4,
          }}
        >
          Traga seus documentos — eu leio, destilo e guardo no lugar certo.
        </span>
      </span>

      <span
        aria-hidden="true"
        style={{
          flex: '0 0 auto',
          fontFamily: 'var(--font-ui)',
          fontSize: 18,
          color: hover ? 'var(--text-secondary)' : 'var(--text-tertiary)',
          transform: hover && !reduceMotion ? 'translateX(2px)' : 'translateX(0)',
          transition: 'color 180ms ease, transform 180ms ease',
        }}
      >
        →
      </span>
    </motion.button>
  )
}



function TeachButton({
  canSubmit,
  uploading,
  count,
  reduceMotion,
  onClick,
  shakeSignal,
}: {
  canSubmit: boolean
  uploading: boolean
  count: number
  reduceMotion: boolean
  onClick: () => void
  
  shakeSignal: number
}) {
  const [hover, setHover] = useState(false)
  const controls = useAnimationControls()
  const enabled = canSubmit && !uploading
  const label = uploading ? 'Enviando…' : 'Ensinar o Cérebro'

  
  
  useEffect(() => {
    if (shakeSignal <= 0 || reduceMotion) return
    void controls.start({
      x: [0, -6, 6, -5, 5, -2, 0],
      transition: { duration: 0.38, ease: 'easeInOut' },
    })
  }, [shakeSignal, reduceMotion, controls])

  return (
    <motion.button
      type="button"
      
      
      onClick={uploading ? undefined : onClick}
      aria-disabled={!enabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      
      whileHover={enabled && !reduceMotion ? { y: -1 } : undefined}
      whileTap={enabled && !reduceMotion ? { scale: 0.98 } : undefined}
      animate={controls}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '9px 16px',
        fontFamily: 'var(--font-ui)',
        fontSize: 13.5,
        fontWeight: 600,
        lineHeight: 1,
        borderRadius: 'var(--radius-md)',
        border: '1px solid transparent',
        
        cursor: uploading ? 'default' : 'pointer',
        
        background: enabled ? WAVE_GRADIENT : 'var(--surface-elevated)',
        color: enabled ? 'var(--bg-base)' : 'var(--text-tertiary)',
        borderColor: enabled ? 'transparent' : 'var(--border-hairline)',
        boxShadow:
          enabled && hover && !reduceMotion
            ? '0 4px 16px color-mix(in srgb, var(--wave-to) 28%, transparent)'
            : 'none',
        transition: 'background 160ms ease, color 160ms ease, box-shadow 180ms ease',
      }}
    >
      <span>{label}</span>
      {!uploading && count > 0 && (
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 18,
            height: 18,
            padding: '0 5px',
            fontSize: 11,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            borderRadius: 999,
            background: enabled ? 'rgb(0 0 0 / 0.22)' : 'var(--surface)',
            color: enabled ? 'var(--bg-base)' : 'var(--text-tertiary)',
          }}
        >
          {count}
        </span>
      )}
      {!uploading && (
        <span aria-hidden="true" style={{ fontSize: 15, lineHeight: 1 }}>
          →
        </span>
      )}
    </motion.button>
  )
}



function StepDot({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 17,
        height: 17,
        marginRight: 7,
        fontFamily: 'var(--font-ui)',
        fontSize: 10.5,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        color: 'var(--text-secondary)',
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-hairline)',
        borderRadius: '50%',
        verticalAlign: 'middle',
        transform: 'translateY(-1px)',
      }}
    >
      {n}
    </span>
  )
}



export function FileGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ flex: '0 0 auto', color: 'var(--text-tertiary)' }}
    >
      <path
        d="M6 3h8l4 4v14H6z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}



function ProgressCard({
  view,
  context,
  reduceMotion,
  onDispensar,
  onRetry,
  onUndo,
  undoing,
  undoErr,
}: {
  view: ImportView
  context?: string | null
  reduceMotion: boolean
  onDispensar: () => void
  onRetry: () => void
  onUndo?: () => void
  undoing?: boolean
  undoErr?: string | null
}) {
  const note = context?.trim() || null
  const isError = view.tone === 'error'
  const isSuccess = view.tone === 'done' || view.tone === 'partial'
  const accent = isError ? ERROR_VAR : isSuccess ? SUCCESS_VAR : null

  const failed = view.terminal && isError
  
  
  const canOfferUndo = view.terminal && isSuccess && !!onUndo

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 6 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={reduceMotion ? undefined : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '18px 20px',
        background: 'var(--surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        
        borderLeft: accent ? `2px solid ${accent}` : '1px solid var(--border-hairline)',
      }}
    >
      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div
          aria-live="polite"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 15.5,
            fontWeight: 640,
            color: isError ? ERROR_VAR : isSuccess ? SUCCESS_VAR : 'var(--text-primary)',
          }}
        >
          {view.headline}
        </div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: 'var(--text-secondary)' }}>
          {view.detail}
        </div>
        {note && (
          <div
            title={note}
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 11.5,
              color: 'var(--text-tertiary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              marginTop: 1,
            }}
          >
            Ensinando: “{note}”
          </div>
        )}
        {}
        {!view.terminal && (
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 11.5,
              color: 'var(--text-tertiary)',
              lineHeight: 1.4,
              marginTop: 2,
            }}
          >
            Roda em segundo plano — pode levar alguns minutos. Pode fechar esta tela, eu continuo.
          </div>
        )}
      </div>

      {}
      {view.files.length > 0 && (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 7,
          }}
        >
          {view.files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                fontFamily: 'var(--font-ui)',
                fontSize: 12.5,
                minWidth: 0,
              }}
            >
              <StatusDot tone={f.tone} reduceMotion={reduceMotion} />
              <span
                style={{
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: '0 1 auto',
                }}
                title={f.name}
              >
                {f.name}
              </span>
              <span
                style={{
                  color:
                    f.tone === 'error'
                      ? ERROR_VAR
                      : f.tone === 'done'
                        ? 'var(--text-secondary)'
                        : 'var(--text-tertiary)',
                  flex: '0 0 auto',
                  marginLeft: 'auto',
                }}
              >
                {f.label}
              </span>
            </li>
          ))}
        </ul>
      )}

      {}
      {canOfferUndo && undoErr && <InlineNote tone="error" text={undoErr} />}

      {}
      {view.terminal && (
        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
          {failed && (
            <Button variant="default" size="sm" onClick={onRetry}>
              Tentar de novo
            </Button>
          )}
          {canOfferUndo && (
            <Button variant="default" size="sm" onClick={onUndo} disabled={undoing}>
              {undoing ? 'Desfazendo…' : 'Desfazer importação'}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onDispensar} disabled={undoing}>
            Dispensar
          </Button>
        </div>
      )}
    </motion.div>
  )
}



function PreparingCard({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 6 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={reduceMotion ? undefined : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '18px 20px',
        background: 'var(--surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <StatusDot tone="active" reduceMotion={reduceMotion} />
      <div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 15,
            fontWeight: 640,
            color: 'var(--text-primary)',
          }}
        >
          Enviando para o Cérebro…
        </div>
        <div
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12.5,
            color: 'var(--text-secondary)',
            marginTop: 3,
          }}
        >
          Preparando a lição — roda em segundo plano, pode levar alguns minutos. Pode fechar, eu continuo.
        </div>
      </div>
    </motion.div>
  )
}



export function StatusDot({
  tone,
  reduceMotion,
}: {
  tone: 'active' | 'done' | 'error'
  reduceMotion: boolean
}) {
  const color =
    tone === 'done' ? SUCCESS_VAR : tone === 'error' ? ERROR_VAR : 'var(--text-tertiary)'

  const pulse = tone === 'active' && !reduceMotion

  return (
    <span
      aria-hidden="true"
      style={{
        flex: '0 0 auto',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        
        animation: pulse ? 'importDotPulse 1.4s ease-in-out infinite' : undefined,
      }}
    />
  )
}



export function InlineNote({ tone, text }: { tone: 'warning' | 'error'; text: string }) {
  const color = tone === 'error' ? ERROR_VAR : 'var(--text-secondary)'
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      style={{
        maxWidth: 500,
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        lineHeight: 1.45,
        color,
      }}
    >
      {text}
    </div>
  )
}



function WaveIcon({ size = 20, muted = false }: { size?: number; muted?: boolean }) {
  const gid = 'importWaveGrad'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ opacity: muted ? 0.7 : 1, flex: '0 0 auto' }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--wave-from)" />
          <stop offset="1" stopColor="var(--wave-to)" />
        </linearGradient>
      </defs>
      {}
      <path
        d="M12 16V6M12 6l-4 4M12 6l4 4"
        stroke={`url(#${gid})`}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 19h14" stroke={`url(#${gid})`} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
