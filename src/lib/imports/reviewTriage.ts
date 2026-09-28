



export function snippetDoCorpo(corpo: string, max = 120): string {
  const linha = (corpo ?? '')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0)
  if (!linha) return ''
  const semMarcador = linha.replace(/^(#{1,6}|[-*>])\s+/, '')
  const colapsado = semMarcador.replace(/\s+/g, ' ').trim()
  if (colapsado.length <= max) return colapsado
  return colapsado.slice(0, max).trimEnd() + '…'
}


export function progressoRevisao(
  total: number,
  restantes: number,
): { revisados: number; fracao: number } {
  if (total <= 0) return { revisados: 0, fracao: 0 }
  const revisados = Math.max(0, total - restantes)
  return { revisados, fracao: Math.min(1, Math.max(0, revisados / total)) }
}


export function toggleSelecao(sel: Set<number>, id: number): Set<number> {
  const novo = new Set(sel)
  if (novo.has(id)) novo.delete(id)
  else novo.add(id)
  return novo
}


export function selecionarTodos(ids: number[], sel: Set<number>): Set<number> {
  const todosMarcados = ids.length > 0 && ids.every((id) => sel.has(id))
  return todosMarcados ? new Set() : new Set(ids)
}


export function estadoSelecaoGeral(
  ids: number[],
  sel: Set<number>,
): 'vazio' | 'parcial' | 'cheio' {
  const marcados = ids.filter((id) => sel.has(id)).length
  if (marcados === 0) return 'vazio'
  if (marcados === ids.length) return 'cheio'
  return 'parcial'
}


export function prunarSelecao(sel: Set<number>, ids: number[]): Set<number> {
  const atuais = new Set(ids)
  const novo = new Set<number>()
  for (const id of sel) if (atuais.has(id)) novo.add(id)
  return novo
}

export type AcaoTeclado =
  | 'aprovar' | 'descartar' | 'editar' | 'selecionar' | 'expandir' | 'baixo' | 'cima'


export function keymapTriagem(key: string): AcaoTeclado | null {
  switch (key) {
    case 'a': return 'aprovar'
    case 'r': return 'descartar'
    case 'e': return 'editar'
    case ' ': return 'selecionar'
    case 'x':
    case 'Enter': return 'expandir'
    case 'j':
    case 'ArrowDown': return 'baixo'
    case 'k':
    case 'ArrowUp': return 'cima'
    default: return null
  }
}
