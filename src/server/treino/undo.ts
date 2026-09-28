


import { getCorrecao, setCorrecaoAtiva, getPersonaCampos, setPersonaCampos } from '@/data/treino'
import { getDirectives, upsertDirectives } from '@/data/agentDirectives'
import { setEntradaEnabled } from '@/data/baseConhecimento'
import { updateAgent } from '@/data/agents'
import { norm } from '@/lib/directives'
import { reverterCampo } from '@/lib/treino/persona'
import type { PersonaCampos } from '@/lib/treino/persona'
import type { TreinoCorrecao } from '@/data/treino'

export interface DesfazerDeps {
  getCorrecao?: typeof getCorrecao
  setCorrecaoAtiva?: typeof setCorrecaoAtiva
  setEntradaEnabled?: typeof setEntradaEnabled
  getDirectives?: typeof getDirectives
  upsertDirectives?: typeof upsertDirectives
  getCampos?: typeof getPersonaCampos
  setCampos?: typeof setPersonaCampos
  bump?: typeof updateAgent
}

export async function desfazerCorrecao(
  correcaoId: string,
  deps: DesfazerDeps = {},
): Promise<{ ok: boolean; motivo?: string }> {
  const _getCorrecao = deps.getCorrecao ?? getCorrecao
  const _setCorrecaoAtiva = deps.setCorrecaoAtiva ?? setCorrecaoAtiva
  const _setEntradaEnabled = deps.setEntradaEnabled ?? setEntradaEnabled
  const _getDirectives = deps.getDirectives ?? getDirectives
  const _upsertDirectives = deps.upsertDirectives ?? upsertDirectives
  const _getCampos = deps.getCampos ?? getPersonaCampos
  const _setCampos = deps.setCampos ?? setPersonaCampos
  const _bump = deps.bump ?? updateAgent

  const correcao: TreinoCorrecao | null = await _getCorrecao(correcaoId)
  if (!correcao) return { ok: false, motivo: 'Correção não encontrada.' }
  if (!correcao.ativo) return { ok: false, motivo: 'Correção já foi desfeita.' }

  const agentId = correcao.agent_id

  if (correcao.gaveta === 'base' || correcao.gaveta === 'playbook') {
    
    if (correcao.ref_id) {
      await _setEntradaEnabled(correcao.ref_id, false)
    }
  } else if (correcao.gaveta === 'diretriz') {
    
    const { diretrizes } = await _getDirectives(agentId)
    const filtradas = diretrizes.filter(
      (d) => norm(d.texto) !== correcao.ref_id,
    )
    if (filtradas.length !== diretrizes.length) {
      await _upsertDirectives(agentId, filtradas)
    }
  } else if (correcao.gaveta === 'regra') {
    
    const campos: PersonaCampos = await _getCampos(agentId)
    const regras = campos.regras_de_ouro ?? []
    const filtradas = regras.filter((r) => r.id !== correcao.ref_id)
    await _setCampos(agentId, { ...campos, regras_de_ouro: filtradas })
  } else {
    
    
    const campos: PersonaCampos = await _getCampos(agentId)
    const revertido = reverterCampo(
      campos,
      correcao.ref_id as keyof PersonaCampos,
      correcao.conteudo,
    )
    await _setCampos(agentId, revertido)
  }

  
  await _setCorrecaoAtiva(correcao.id, false)
  await _bump(agentId, {})

  return { ok: true }
}
