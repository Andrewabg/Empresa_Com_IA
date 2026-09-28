'use client'


import { useState } from 'react'
import { Toggle } from './parts'

export interface ToolCustomMeta {
  id: string
  titulo: string
  descricao: string
}

export function ToolsCustomCard({ agentId, catalogo, initial, onSaved }: {
  agentId: string
  
  catalogo: ToolCustomMeta[]
  
  initial: string[]
  
  onSaved: (ids: string[]) => void
}) {
  const [ligadas, setLigadas] = useState<string[]>(initial)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function toggle(id: string, v: boolean) {
    if (salvando) return
    setErro(null)
    const anterior = ligadas
    const proximo = v ? [...new Set([...anterior, id])] : anterior.filter((x) => x !== id)
    setLigadas(proximo) 
    setSalvando(true)
    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(agentId)}/custom-tools`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_tools: proximo }),
      })
      if (!res.ok) throw new Error(`status ${res.status}`)
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; tools?: { custom_tools?: string[] } }
        | null
      
      const doServer = data?.tools?.custom_tools
      const efetivas = Array.isArray(doServer) ? doServer : proximo
      setLigadas(efetivas)
      onSaved(efetivas)
    } catch {
      setLigadas(anterior) 
      setErro('Não deu pra atualizar. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {erro && (
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--reject)' }}>{erro}</p>
      )}
      {catalogo.map((t) => (
        <Toggle
          key={t.id}
          id={`agent-custom-tool-${t.id}`}
          label={t.titulo}
          help={t.descricao}
          checked={ligadas.includes(t.id)}
          onChange={(v) => void toggle(t.id, v)}
          disabled={salvando}
        />
      ))}
    </div>
  )
}
