'use client'

import type { EscolhaDeVoz } from '@/lib/voicePalette'
import type { Agent, AprendizadoUI, DesligadoUI, DiretrizUI, SaveState, TarefaUI } from './types'
import type { ToolCustomMeta } from './ToolsCustomCard'
import { PalcoStage } from './PalcoStage'
import { FichaDetalhes } from './FichaDetalhes'


export function PalcoLeigo(props: {
  agents: Agent[]
  selected: Agent | null
  selectedId: string | null
  onSelect: (id: string) => void
  
  tagline: string | null
  descricao: string | null
  conversarHref: string | null
  estacaoHref: string | null
  feriasSave: SaveState
  onFerias: (v: boolean) => void
  nomeSave: SaveState
  onRenomear: (nome: string) => void
  tarefas: TarefaUI[]
  skillNames: string[]
  directives: DiretrizUI[]
  dirState: 'loading' | 'loaded' | 'error'
  dirSave: SaveState
  newDirective: string
  onNewDirective: (v: string) => void
  onAddCombinado: () => void
  onRemoveCombinado: (i: number) => void
  managerOptions: { id: string; name: string; role: string }[]
  managerSave: SaveState
  onManager: (id: string) => void
  vozSave: SaveState
  onVoz: (escolha: EscolhaDeVoz) => void
  learnings: AprendizadoUI[]
  
  customTools: ToolCustomMeta[]
  
  onCustomToolsSaved: (agentId: string, ids: string[]) => void
  
  isCanal: boolean
  
  treinoHref: string | null
  
  desligados: DesligadoUI[]
  desligamentoSave: SaveState
  onDesligar: () => void
  onReadmitir: (id: string) => void
  
  isDono: boolean
}) {
  const { selected } = props
  return (
    <div className={`palco-shell${selected ? '' : ' palco-shell--solo'}`}>
      <PalcoStage
        agents={props.agents}
        selected={selected}
        selectedId={props.selectedId}
        onSelect={props.onSelect}
        tagline={props.tagline}
        conversarHref={props.conversarHref}
        estacaoHref={props.estacaoHref}
        feriasSave={props.feriasSave}
        onFerias={props.onFerias}
        isCanal={props.isCanal}
        treinoHref={props.treinoHref}
        desligados={props.desligados}
        desligamentoSave={props.desligamentoSave}
        onDesligar={props.onDesligar}
        onReadmitir={props.onReadmitir}
        isDono={props.isDono}
      />
      {selected && (
        <FichaDetalhes
          agent={selected}
          nomeSave={props.nomeSave}
          onRenomear={props.onRenomear}
          isCanal={props.isCanal}
          treinoHref={props.treinoHref}
          descricao={props.descricao}
          tarefas={props.tarefas}
          skillNames={props.skillNames}
          directives={props.directives}
          dirState={props.dirState}
          dirSave={props.dirSave}
          newDirective={props.newDirective}
          onNewDirective={props.onNewDirective}
          onAddCombinado={props.onAddCombinado}
          onRemoveCombinado={props.onRemoveCombinado}
          managerOptions={props.managerOptions}
          managerSave={props.managerSave}
          onManager={props.onManager}
          vozSave={props.vozSave}
          onVoz={props.onVoz}
          learnings={props.learnings}
          customTools={props.customTools}
          onCustomToolsSaved={props.onCustomToolsSaved}
        />
      )}
    </div>
  )
}
