

import { salvarEntradaBase } from '@/server/canais/baseActions'
import { applyDirective } from '@/server/tools/registrarDiretriz'
import {
  getPersonaCampos,
  setPersonaCampos,
  inserirCorrecao,
  marcarCorrigido,
  enfileirarRegressao,
  type TreinoCaso,
} from '@/data/treino'
import { norm } from '@/lib/directives'
import { updateAgent } from '@/data/agents'
import { aplicarCampo } from '@/lib/treino/persona'
import {
  consolidarRegraOuro,
  consolidarPlaybook as consolidarPlaybookFn,
} from '@/server/treino/consolidacao'
import type { Proposta } from '@/server/treino/trainer'

export interface AplicarDeps {
  salvar?: typeof salvarEntradaBase
  applyDir?: typeof applyDirective
  getCampos?: typeof getPersonaCampos
  setCampos?: typeof setPersonaCampos
  inserirCorrecao?: typeof inserirCorrecao
  marcarCorrigido?: typeof marcarCorrigido
  bump?: typeof updateAgent
  enfileirar?: typeof enfileirarRegressao
  consolidarRegra?: typeof consolidarRegraOuro
  consolidarPlaybook?: typeof consolidarPlaybookFn
}

export async function aplicarCorrecao(
  caso: TreinoCaso,
  proposta: Proposta,
  deps: AplicarDeps = {},
): Promise<void> {
  const salvar = deps.salvar ?? salvarEntradaBase
  const applyDir = deps.applyDir ?? applyDirective
  const getCampos = deps.getCampos ?? getPersonaCampos
  const setCampos = deps.setCampos ?? setPersonaCampos
  const inserir = deps.inserirCorrecao ?? inserirCorrecao
  const marcar = deps.marcarCorrigido ?? marcarCorrigido
  const bump = deps.bump ?? updateAgent
  const enfileirar = deps.enfileirar ?? enfileirarRegressao
  const consolidarRegra = deps.consolidarRegra ?? consolidarRegraOuro
  const consolidarPlaybook = deps.consolidarPlaybook ?? consolidarPlaybookFn

  for (const g of proposta.gavetas) {
    if (g.gaveta === 'base') {
      const r = await salvar({
        titulo: g.titulo ?? g.conteudo.slice(0, 60),
        conteudo: g.conteudo,
        agent_id: caso.agent_id,
        enabled: true,
        origem: 'aprendizado',
      })
      if (r.ok) {
        await inserir({
          caso_id: caso.id,
          agent_id: caso.agent_id,
          gaveta: 'base',
          ref_tabela: 'base_conhecimento',
          ref_id: r.id ?? null,
          conteudo: g.conteudo,
        })
      }
    } else if (g.gaveta === 'playbook') {
      const r = await consolidarPlaybook(caso.agent_id, {
        titulo: g.titulo ?? g.conteudo.slice(0, 60),
        conteudo: g.conteudo,
      })
      if (r.ok && r.id) {
        await inserir({
          caso_id: caso.id,
          agent_id: caso.agent_id,
          gaveta: 'playbook',
          ref_tabela: 'base_conhecimento',
          ref_id: r.id,
          conteudo: g.conteudo,
        })
      }
    } else if (g.gaveta === 'regra') {
      const { idAfetado } = await consolidarRegra(caso.agent_id, { texto: g.conteudo })
      if (idAfetado) {
        await inserir({
          caso_id: caso.id,
          agent_id: caso.agent_id,
          gaveta: 'regra',
          ref_tabela: 'atendente_persona',
          ref_id: idAfetado,
          conteudo: g.conteudo,
        })
      }
    } else if (g.gaveta === 'diretriz') {
      await applyDir({ agentId: caso.agent_id, diretriz: g.conteudo })
      await inserir({
        caso_id: caso.id,
        agent_id: caso.agent_id,
        gaveta: 'diretriz',
        ref_tabela: 'agent_directives',
        ref_id: norm(g.conteudo),
        conteudo: g.conteudo,
      })
    } else if (g.gaveta === 'persona') {
      const campos = await getCampos(caso.agent_id)
      await setCampos(caso.agent_id, aplicarCampo(campos, g.campo!, g.conteudo))
      await inserir({
        caso_id: caso.id,
        agent_id: caso.agent_id,
        gaveta: 'persona',
        ref_tabela: 'atendente_persona',
        ref_id: g.campo!,
        conteudo: g.conteudo,
      })
    } else {
      
      
      
      console.warn('[treino] gaveta não roteável ignorada:', (g as { gaveta: string }).gaveta)
    }
  }

  await bump(caso.agent_id, {})
  await marcar(caso.id, proposta.criterio, new Date().toISOString())
  await enfileirar(caso.agent_id)
}
