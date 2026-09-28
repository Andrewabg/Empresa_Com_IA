'use client'

import { useCallback, useRef, useState } from 'react'
import { clampScale, screenToGraph, type Viewport } from '@/lib/brain-graph-view'


export interface GraphViewport {
  svgRef: React.RefObject<SVGSVGElement | null>
  vp: Viewport
  
  dragId: string | null
  
  overrideOf: (id: string) => { x: number; y: number } | undefined
  onWheel: (e: React.WheelEvent) => void
  onPointerDownNode: (e: React.PointerEvent, id: string, lx: number, ly: number) => void
  onPointerDownBackground: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  
  consumeMoved: () => boolean
  zoomIn: () => void
  zoomOut: () => void
  reset: () => void
}


function screenToViewBox(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  H: number,
): { x: number; y: number } {
  const side = 2 * H
  
  const s = Math.min(rect.width, rect.height) / side
  
  const offX = (rect.width - side * s) / 2
  const offY = (rect.height - side * s) / 2
  return {
    x: (clientX - rect.left - offX) / s - H,
    y: (clientY - rect.top - offY) / s - H,
  }
}

export function useGraphViewport(H: number): GraphViewport {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [vp, setVp] = useState<Viewport>({ scale: 1, tx: 0, ty: 0 })

  
  
  const overridesRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const [dragId, setDragId] = useState<string | null>(null)
  
  const [, setTick] = useState(0)
  const bump = useCallback(() => setTick((t) => t + 1), [])

  
  const panRef = useRef<{ startVbX: number; startVbY: number; baseTx: number; baseTy: number } | null>(null)

  
  
  
  const pendingRef = useRef<
    | { kind: 'node'; id: string; lx: number; ly: number; pointerId: number }
    | { kind: 'bg'; startVbX: number; startVbY: number; baseTx: number; baseTy: number; pointerId: number }
    | null
  >(null)

  
  
  const movedRef = useRef(false)
  const downPtRef = useRef<{ x: number; y: number } | null>(null)

  const overrideOf = useCallback((id: string) => overridesRef.current.get(id), [])

  
  
  const consumeMoved = useCallback(() => {
    const m = movedRef.current
    movedRef.current = false
    return m
  }, [])

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      const svg = svgRef.current
      if (!svg) return
      e.preventDefault()
      const rect = svg.getBoundingClientRect()
      const { x: vx, y: vy } = screenToViewBox(e.clientX, e.clientY, rect, H)
      setVp((cur) => {
        const next = clampScale(cur.scale * (e.deltaY < 0 ? 1.1 : 0.9))
        const k = next / cur.scale
        
        return { scale: next, tx: vx - (vx - cur.tx) * k, ty: vy - (vy - cur.ty) * k }
      })
    },
    [H],
  )

  
  
  const onPointerDownNode = useCallback(
    (e: React.PointerEvent, id: string, lx: number, ly: number) => {
      e.stopPropagation()
      movedRef.current = false
      downPtRef.current = { x: e.clientX, y: e.clientY }
      pendingRef.current = { kind: 'node', id, lx, ly, pointerId: e.pointerId }
    },
    [],
  )

  
  const onPointerDownBackground = useCallback(
    (e: React.PointerEvent) => {
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const { x: vbx, y: vby } = screenToViewBox(e.clientX, e.clientY, rect, H)
      movedRef.current = false
      downPtRef.current = { x: e.clientX, y: e.clientY }
      pendingRef.current = { kind: 'bg', startVbX: vbx, startVbY: vby, baseTx: vp.tx, baseTy: vp.ty, pointerId: e.pointerId }
    },
    [H, vp.tx, vp.ty],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const svg = svgRef.current
      if (!svg) return
      const pend = pendingRef.current

      
      
      if (pend && dragId == null && panRef.current == null) {
        if (!downPtRef.current || Math.hypot(e.clientX - downPtRef.current.x, e.clientY - downPtRef.current.y) <= 4) {
          return 
        }
        movedRef.current = true
        svg.setPointerCapture?.(pend.pointerId)
        if (pend.kind === 'node') {
          const cur = overridesRef.current.get(pend.id) ?? { x: pend.lx, y: pend.ly }
          overridesRef.current.set(pend.id, cur)
          setDragId(pend.id)
        } else {
          panRef.current = { startVbX: pend.startVbX, startVbY: pend.startVbY, baseTx: pend.baseTx, baseTy: pend.baseTy }
        }
        pendingRef.current = null
      }

      if (dragId == null && panRef.current == null) return
      const rect = svg.getBoundingClientRect()
      const { x: vbx, y: vby } = screenToViewBox(e.clientX, e.clientY, rect, H)

      if (dragId != null) {
        
        const g = screenToGraph(vbx, vby, vp)
        overridesRef.current.set(dragId, { x: g.x, y: g.y })
        bump()
        return
      }
      
      const pan = panRef.current!
      setVp((cur) => ({ ...cur, tx: pan.baseTx + (vbx - pan.startVbX), ty: pan.baseTy + (vby - pan.startVbY) }))
    },
    [dragId, vp, H, bump],
  )

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    svgRef.current?.releasePointerCapture?.(e.pointerId)
    setDragId(null)
    panRef.current = null
    pendingRef.current = null
  }, [])

  const zoomBy = useCallback((factor: number) => {
    
    setVp((cur) => {
      const next = clampScale(cur.scale * factor)
      const k = next / cur.scale
      return { scale: next, tx: cur.tx * k, ty: cur.ty * k }
    })
  }, [])

  const zoomIn = useCallback(() => zoomBy(1.2), [zoomBy])
  const zoomOut = useCallback(() => zoomBy(1 / 1.2), [zoomBy])
  const reset = useCallback(() => {
    setVp({ scale: 1, tx: 0, ty: 0 })
    overridesRef.current.clear()
    setDragId(null)
    panRef.current = null
    pendingRef.current = null
    movedRef.current = false
    downPtRef.current = null
    bump()
  }, [bump])

  return {
    svgRef,
    vp,
    dragId,
    overrideOf,
    onWheel,
    onPointerDownNode,
    onPointerDownBackground,
    onPointerMove,
    onPointerUp,
    consumeMoved,
    zoomIn,
    zoomOut,
    reset,
  }
}
