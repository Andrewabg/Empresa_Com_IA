
import { renderRegrasOuro, type RegraOuro } from './regrasOuro'

export interface PersonaCampos {
  quem_e?: string
  tom?: string
  nunca_faz?: string[]
  regras_de_ouro?: RegraOuro[]
}

export function compilarPersona(campos: PersonaCampos): string {
  const quem = (campos.quem_e ?? '').trim()
  const tom = (campos.tom ?? '').trim()
  const nunca = (campos.nunca_faz ?? []).map((s) => s.trim()).filter(Boolean)
  const regras = campos.regras_de_ouro ?? []
  if (!quem && !tom && !nunca.length && !regras.length) return ''
  const linhas: string[] = ['\n\n## PERSONA']
  if (quem) linhas.push(`Quem ela é: ${quem}`)
  if (tom) linhas.push(`Tom: ${tom}`)
  if (nunca.length) linhas.push('Nunca:', ...nunca.map((n) => `- ${n}`))
  return linhas.join('\n') + renderRegrasOuro(regras)
}

export function aplicarCampo(campos: PersonaCampos, campo: keyof PersonaCampos, valor: string): PersonaCampos {
  const v = valor.trim()
  if (campo === 'nunca_faz') {
    const atual = campos.nunca_faz ?? []
    return atual.includes(v) ? campos : { ...campos, nunca_faz: [...atual, v] }
  }
  return { ...campos, [campo]: v }
}

export function reverterCampo(campos: PersonaCampos, campo: keyof PersonaCampos, valor: string): PersonaCampos {
  const v = valor.trim()
  if (campo === 'nunca_faz') {
    return { ...campos, nunca_faz: (campos.nunca_faz ?? []).filter((x) => x !== v) }
  }
  return campos[campo] === v ? { ...campos, [campo]: '' } : campos
}
