'use client'



import { Toggle } from '@/app/agentes/parts'
import type { ToolCustomMeta } from '@/app/agentes/ToolsCustomCard'


export function CustomToolsEditor({ catalogo, ligadas, onChange }: {
  catalogo: ToolCustomMeta[]
  ligadas: string[]
  onChange: (ids: string[]) => void
}) {
  function toggle(id: string, v: boolean) {
    const proximo = v ? [...new Set([...ligadas, id])] : ligadas.filter((x) => x !== id)
    onChange(proximo)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {catalogo.map((t) => (
        <Toggle
          key={t.id}
          id={`rascunho-custom-tool-${t.id}`}
          label={t.titulo}
          help={t.descricao}
          checked={ligadas.includes(t.id)}
          onChange={(v) => toggle(t.id, v)}
        />
      ))}
    </div>
  )
}
