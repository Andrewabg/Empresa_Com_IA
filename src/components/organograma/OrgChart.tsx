'use client'


import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { caminhoCotovelo } from '@/lib/organograma/conectores'
import type { OrgNodeUI } from '@/lib/organograma/orgView'
import { OrgNodeCard } from './OrgNodeCard'
import { OrgConnectors, type ArestaView } from './OrgConnectors'

interface SubtreeProps {
  node: OrgNodeUI
  isRoot: boolean
  orquestrando: string[]
  registerRef: (id: string, el: HTMLDivElement | null) => void
}


function Subtree({ node, isRoot, orquestrando, registerRef }: SubtreeProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 44 }}>
      <OrgNodeCard
        node={node}
        isRoot={isRoot}
        orquestrando={orquestrando.includes(node.id)}
        registerRef={registerRef}
      />
      {node.children.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'flex-start',
            gap: '44px 28px',
          }}
        >
          {node.children.map((c) => (
            <Subtree
              key={c.id}
              node={c}
              isRoot={false}
              orquestrando={orquestrando}
              registerRef={registerRef}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function OrgChart({ tree, orquestrando }: { tree: OrgNodeUI[]; orquestrando: string[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cardEls = useRef(new Map<string, HTMLDivElement>())
  const [arestas, setArestas] = useState<ArestaView[]>([])
  const [box, setBox] = useState({ width: 0, height: 0 })

  const registerRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) cardEls.current.set(id, el)
    else cardEls.current.delete(id)
  }, [])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const medir = () => {
      const base = container.getBoundingClientRect()
      const rectDe = (el: HTMLElement) => {
        const r = el.getBoundingClientRect()
        return { x: r.left - base.left, y: r.top - base.top, width: r.width, height: r.height }
      }
      const out: ArestaView[] = []
      const anda = (nodes: OrgNodeUI[]) => {
        for (const n of nodes) {
          const paiEl = cardEls.current.get(n.id)
          for (const c of n.children) {
            const filhoEl = cardEls.current.get(c.id)
            if (paiEl && filhoEl) {
              out.push({
                key: c.id,
                d: caminhoCotovelo(rectDe(paiEl), rectDe(filhoEl)),
                pulso: c.live.running > 0,
              })
            }
          }
          anda(n.children)
        }
      }
      anda(tree)
      setArestas(out)
      setBox({ width: container.clientWidth, height: container.clientHeight })
    }
    medir()
    if (typeof ResizeObserver === 'undefined') return
    
    
    const ro = new ResizeObserver(medir)
    ro.observe(container)
    return () => ro.disconnect()
  }, [tree])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: '44px 56px',
        padding: '8px 0 16px',
      }}
    >
      <OrgConnectors arestas={arestas} width={box.width} height={box.height} />
      {tree.map((raiz) => (
        <Subtree
          key={raiz.id}
          node={raiz}
          isRoot
          orquestrando={orquestrando}
          registerRef={registerRef}
        />
      ))}
    </div>
  )
}
