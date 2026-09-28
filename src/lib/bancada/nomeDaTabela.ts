


const MAX_BASE = 40

export function nomeDaTabela(n: number, base: string): string {
  const limpa = base
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, MAX_BASE)
    .replace(/_+$/g, '')
  const num = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0
  return `t${num}_${limpa || 'tabela'}`
}
