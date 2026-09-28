
export interface CasoFila { id: string; status: 'aberto' | 'corrigido' | 'ignorado'; created_at: string; origem: string }
export function filtrarAbertos<T extends { status: string }>(casos: T[]): T[] { return casos.filter((c) => c.status === 'aberto') }
export function ordenarFila<T extends { created_at: string }>(casos: T[]): T[] {
  return [...casos].sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
}
