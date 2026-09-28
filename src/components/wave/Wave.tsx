'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/lib/motion'
import type { ActiveRipple, WaveState } from './waveMachine'

export type WaveScale = 'micro' | 'inline' | 'hero'

export interface WaveProps {
  scale: WaveScale
  state: WaveState
  amplitude: number
  ripples: ActiveRipple[]
  className?: string
  
  'aria-label'?: string
}


const SCALE_GEOMETRY: Record<
  WaveScale,
  { height: number; baseAmp: number; lineWidth: number; glow: number; points: number }
> = {
  
  micro: { height: 24, baseAmp: 0.18, lineWidth: 1.25, glow: 4, points: 90 },
  
  inline: { height: 64, baseAmp: 0.34, lineWidth: 1.75, glow: 9, points: 160 },
  
  hero: { height: 220, baseAmp: 0.5, lineWidth: 2.5, glow: 22, points: 280 },
}

const FALLBACK_FROM = '#28E0C8'
const FALLBACK_TO = '#7C5CFF'

function hexToRgba(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}


function readVar(el: Element, name: string, fallback: string): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim()
  return v || fallback
}


export function Wave({
  scale,
  state,
  amplitude,
  ripples,
  className,
  'aria-label': ariaLabel,
}: WaveProps) {
  const reducedMotion = useReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  
  
  const propsRef = useRef({ scale, state, amplitude, ripples })
  propsRef.current = { scale, state, amplitude, ripples }

  
  const smoothAmpRef = useRef(0)

  const geom = SCALE_GEOMETRY[scale]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let width = 0
    let height = 0
    let dpr = 1
    let gradFrom = FALLBACK_FROM
    let gradTo = FALLBACK_TO

    
    function resize() {
      if (!canvas) return
      
      
      
      
      
      
      
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(1, canvas.clientWidth)
      height = Math.max(1, canvas.clientHeight)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      gradFrom = readVar(canvas, '--wave-from', FALLBACK_FROM)
      gradTo = readVar(canvas, '--wave-to', FALLBACK_TO)
      
      
      if (reducedMotion) drawStatic()
    }

    
    function drawStatic() {
      const c = ctx!
      const mid = height / 2
      c.clearRect(0, 0, width, height)
      const grad = c.createLinearGradient(0, 0, width, 0)
      grad.addColorStop(0, gradFrom)
      grad.addColorStop(1, gradTo)
      const path = new Path2D()
      const N = geom.points
      for (let i = 0; i <= N; i++) {
        const x01 = i / N
        const x = x01 * width
        const edge = Math.sin(x01 * Math.PI)
        const y = mid - Math.sin(x01 * Math.PI * 2) * geom.baseAmp * height * 0.4 * edge
        if (i === 0) path.moveTo(x, y)
        else path.lineTo(x, y)
      }
      c.lineCap = 'round'
      c.globalAlpha = 0.6
      c.strokeStyle = grad
      c.shadowColor = gradTo
      c.shadowBlur = geom.glow * 0.5
      c.lineWidth = geom.lineWidth
      c.stroke(path)
    }

    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const t0 = performance.now()

    
    function draw(now: number) {
      const c = ctx!
      const p = propsRef.current
      const g = SCALE_GEOMETRY[p.scale]
      const mid = height / 2
      const elapsed = (now - t0) / 1000 

      c.clearRect(0, 0, width, height)

      
      const grad = c.createLinearGradient(0, 0, width, 0)
      grad.addColorStop(0, gradFrom)
      grad.addColorStop(1, gradTo)

      
      let targetAmp = g.baseAmp * 0.55 
      let opacity = 0.42
      if (p.state === 'listening') {
        targetAmp = g.baseAmp * (0.4 + p.amplitude * 1.0)
        opacity = 0.7 + p.amplitude * 0.3
      } else if (p.state === 'thinking') {
        targetAmp = g.baseAmp * 0.7
        opacity = 0.62
      } else if (p.state === 'acting') {
        targetAmp = g.baseAmp * 0.6
        opacity = 0.7
      }
      
      smoothAmpRef.current += (targetAmp - smoothAmpRef.current) * 0.12
      const amp = smoothAmpRef.current * height

      
      const breath = 0.5 + 0.5 * Math.sin(elapsed * 2 * Math.PI * 0.1)
      const breathFactor = p.state === 'idle' ? 0.45 + 0.55 * breath : 1

      
      
      const rippleAt = (x01: number): number => {
        if (p.ripples.length === 0) return 0
        let sum = 0
        for (const r of p.ripples) {
          const prog = r.progress 
          
          const center = prog
          const dx = x01 - center
          const widthFactor = 0.10 + prog * 0.05
          const env = Math.exp(-(dx * dx) / (2 * widthFactor * widthFactor))
          
          const life = Math.sin(prog * Math.PI)
          sum += env * life
        }
        return Math.min(1.4, sum)
      }

      
      const shimmerCenter = p.state === 'thinking' ? (elapsed * 0.35) % 1 : -1

      
      const path = new Path2D()
      const N = g.points
      for (let i = 0; i <= N; i++) {
        const x01 = i / N
        const x = x01 * width

        
        const phase = elapsed * (p.state === 'listening' ? 2.4 : 1.2)
        let y =
          Math.sin(x01 * Math.PI * 3 + phase) * 0.6 +
          Math.sin(x01 * Math.PI * 6 - phase * 1.3) * 0.28 +
          Math.sin(x01 * Math.PI * 11 + phase * 0.7) * 0.12

        
        const edge = Math.sin(x01 * Math.PI)
        y *= edge

        
        const rip = rippleAt(x01)
        const yPx =
          mid -
          (y * amp * breathFactor + rip * amp * 1.6 * (p.state === 'acting' ? 1 : 0))

        if (i === 0) path.moveTo(x, yPx)
        else path.lineTo(x, yPx)
      }

      
      c.lineCap = 'round'
      c.lineJoin = 'round'

      
      c.save()
      c.globalAlpha = opacity * 0.5
      c.strokeStyle = grad
      c.shadowColor = gradTo
      c.shadowBlur = g.glow
      c.lineWidth = g.lineWidth * 2.4
      c.stroke(path)
      c.restore()

      
      c.save()
      c.globalAlpha = opacity
      c.strokeStyle = grad
      c.shadowColor = gradFrom
      c.shadowBlur = g.glow * 0.6
      c.lineWidth = g.lineWidth
      c.stroke(path)
      c.restore()

      
      if (p.state === 'acting' && p.ripples.length > 0) {
        c.save()
        c.globalCompositeOperation = 'lighter'
        for (const r of p.ripples) {
          const prog = r.progress
          const life = Math.sin(prog * Math.PI) 
          if (life <= 0.02) continue
          const cx = prog * width
          
          const rip = rippleAt(prog)
          const cy = mid - (rip * amp * 1.6)
          const rad = g.height * (0.35 + 0.25 * prog)
          const glow = c.createRadialGradient(cx, cy, 0, cx, cy, rad)
          glow.addColorStop(0, hexToRgba(gradFrom, 0.28 * life))
          glow.addColorStop(0.5, hexToRgba(gradTo, 0.12 * life))
          glow.addColorStop(1, hexToRgba(gradTo, 0))
          c.fillStyle = glow
          c.fillRect(cx - rad, cy - rad, rad * 2, rad * 2)
        }
        c.restore()
      }

      
      if (shimmerCenter >= 0) {
        const sx = shimmerCenter * width
        const radial = c.createRadialGradient(sx, mid, 0, sx, mid, g.height * 0.9)
        radial.addColorStop(0, 'rgba(255,255,255,0.22)')
        radial.addColorStop(1, 'rgba(255,255,255,0)')
        c.save()
        c.globalCompositeOperation = 'lighter'
        c.fillStyle = radial
        c.fillRect(0, 0, width, height)
        c.restore()
      }
    }

    
    if (reducedMotion) {
      drawStatic()
      return () => {
        ro.disconnect()
      }
    }

    
    
    
    
    
    
    const loop = (now: number) => {
      draw(now)
      raf = requestAnimationFrame(loop)
    }
    const start = () => { if (raf === 0) raf = requestAnimationFrame(loop) }
    const stop = () => { if (raf !== 0) { cancelAnimationFrame(raf); raf = 0 } }
    const onVis = () => {
      if (document.visibilityState === 'visible') start()
      else stop()
    }
    document.addEventListener('visibilitychange', onVis)
    if (document.visibilityState === 'visible') start()

    return () => {
      document.removeEventListener('visibilitychange', onVis)
      stop()
      ro.disconnect()
    }
  }, [reducedMotion, geom])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      role="img"
      aria-label={ariaLabel ?? `Onda — ${state}`}
      style={{ display: 'block', width: '100%', height: geom.height }}
    />
  )
}
