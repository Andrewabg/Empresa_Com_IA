

import type { ChannelConfigDelta } from '@/lib/canais/configSnapshot'

const ALLOWED_KEYS = new Set([
  'name',
  'system_prompt',
  'model',
  'enabled',
  'skills',
  'tools',
  'personaCampos',
  'diretrizes',
  'base',
])

const VALID_ACTION_MODES = new Set(['hitl', 'direto'])
const VALID_TIPOS = new Set(['fato', 'playbook'])

type ValidarResult =
  | { delta: ChannelConfigDelta }
  | { error: string }

export function validarDelta(body: unknown): ValidarResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'body deve ser um objeto' }
  }
  const b = body as Record<string, unknown>

  
  for (const k of Object.keys(b)) {
    if (!ALLOWED_KEYS.has(k)) return { error: `chave desconhecida: '${k}'` }
  }

  const delta: ChannelConfigDelta = {}

  if ('name' in b) {
    if (typeof b.name !== 'string' || !b.name.trim()) return { error: 'name deve ser string não-vazia' }
    delta.name = b.name
  }

  if ('system_prompt' in b) {
    if (typeof b.system_prompt !== 'string' || !b.system_prompt.trim()) {
      return { error: 'system_prompt deve ser string não-vazia' }
    }
    delta.system_prompt = b.system_prompt
  }

  if ('model' in b) {
    if (b.model !== null && typeof b.model !== 'string') {
      return { error: 'model deve ser string ou null' }
    }
    delta.model = b.model as string | null
  }

  if ('enabled' in b) {
    if (typeof b.enabled !== 'boolean') return { error: 'enabled deve ser boolean' }
    delta.enabled = b.enabled
  }

  if ('skills' in b) {
    if (!Array.isArray(b.skills) || !b.skills.every((x) => typeof x === 'string')) {
      return { error: 'skills deve ser array de strings' }
    }
    delta.skills = b.skills as string[]
  }

  if ('tools' in b) {
    if (!b.tools || typeof b.tools !== 'object' || Array.isArray(b.tools)) {
      return { error: 'tools deve ser um objeto' }
    }
    const tools = b.tools as Record<string, unknown>
    
    if ('composio_action_modes' in tools) {
      const modes = tools.composio_action_modes
      if (!modes || typeof modes !== 'object' || Array.isArray(modes)) {
        return { error: 'tools.composio_action_modes deve ser um objeto' }
      }
      for (const [toolkit, mode] of Object.entries(modes as Record<string, unknown>)) {
        if (!VALID_ACTION_MODES.has(mode as string)) {
          return { error: `tools.composio_action_modes['${toolkit}'] deve ser 'hitl' ou 'direto'` }
        }
      }
    }
    delta.tools = tools as ChannelConfigDelta['tools']
  }

  if ('personaCampos' in b) {
    if (!b.personaCampos || typeof b.personaCampos !== 'object' || Array.isArray(b.personaCampos)) {
      return { error: 'personaCampos deve ser um objeto' }
    }
    delta.personaCampos = b.personaCampos as ChannelConfigDelta['personaCampos']
  }

  if ('diretrizes' in b) {
    if (!b.diretrizes || typeof b.diretrizes !== 'object' || Array.isArray(b.diretrizes)) {
      return { error: 'diretrizes deve ser um objeto { add?, remove? }' }
    }
    const d = b.diretrizes as Record<string, unknown>
    if ('add' in d && (!Array.isArray(d.add) || !d.add.every((x) => typeof x === 'string'))) {
      return { error: 'diretrizes.add deve ser array de strings' }
    }
    if ('remove' in d && (!Array.isArray(d.remove) || !d.remove.every((x) => typeof x === 'string'))) {
      return { error: 'diretrizes.remove deve ser array de strings' }
    }
    delta.diretrizes = {
      add: (d.add as string[] | undefined),
      remove: (d.remove as string[] | undefined),
    }
  }

  if ('base' in b) {
    if (!b.base || typeof b.base !== 'object' || Array.isArray(b.base)) {
      return { error: 'base deve ser um objeto' }
    }
    const bs = b.base as Record<string, unknown>
    for (const chave of ['add', 'update', 'toggle', 'remove'] as const) {
      if (chave in bs && !Array.isArray(bs[chave])) {
        return { error: `base.${chave} deve ser um array` }
      }
    }
    const add = (bs.add as unknown[] | undefined) ?? []
    const update = (bs.update as unknown[] | undefined) ?? []
    const toggle = (bs.toggle as unknown[] | undefined) ?? []
    const remove = (bs.remove as unknown[] | undefined) ?? []

    for (let i = 0; i < add.length; i++) {
      const it = add[i]
      if (!it || typeof it !== 'object' || Array.isArray(it)) return { error: `base.add[${i}] deve ser um objeto` }
      const o = it as Record<string, unknown>
      if (typeof o.titulo !== 'string' || !o.titulo.trim()) return { error: `base.add[${i}].titulo deve ser string não-vazia` }
      if (typeof o.conteudo !== 'string' || !o.conteudo.trim()) return { error: `base.add[${i}].conteudo deve ser string não-vazia` }
      if (!VALID_TIPOS.has(o.tipo as string)) return { error: `base.add[${i}].tipo deve ser 'fato' ou 'playbook'` }
    }

    for (let i = 0; i < update.length; i++) {
      const it = update[i]
      if (!it || typeof it !== 'object' || Array.isArray(it)) return { error: `base.update[${i}] deve ser um objeto` }
      const o = it as Record<string, unknown>
      if (typeof o.id !== 'string' || !o.id.trim()) return { error: `base.update[${i}].id deve ser string não-vazia` }
      if (typeof o.titulo !== 'string' || !o.titulo.trim()) return { error: `base.update[${i}].titulo deve ser string não-vazia` }
      if (typeof o.conteudo !== 'string' || !o.conteudo.trim()) return { error: `base.update[${i}].conteudo deve ser string não-vazia` }
      if (!VALID_TIPOS.has(o.tipo as string)) return { error: `base.update[${i}].tipo deve ser 'fato' ou 'playbook'` }
    }

    for (let i = 0; i < toggle.length; i++) {
      const it = toggle[i]
      if (!it || typeof it !== 'object' || Array.isArray(it)) return { error: `base.toggle[${i}] deve ser um objeto` }
      const o = it as Record<string, unknown>
      if (typeof o.id !== 'string' || !o.id.trim()) return { error: `base.toggle[${i}].id deve ser string não-vazia` }
      if (typeof o.enabled !== 'boolean') return { error: `base.toggle[${i}].enabled deve ser boolean` }
    }

    if (!remove.every((x) => typeof x === 'string')) return { error: 'base.remove deve ser array de strings' }

    delta.base = {
      add: add as { titulo: string; conteudo: string; tipo: 'fato' | 'playbook' }[],
      update: update as { id: string; titulo: string; conteudo: string; tipo: 'fato' | 'playbook' }[],
      toggle: toggle as { id: string; enabled: boolean }[],
      remove: remove as string[],
    } satisfies ChannelConfigDelta['base']
  }

  return { delta }
}
