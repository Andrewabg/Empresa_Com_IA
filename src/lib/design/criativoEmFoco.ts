















import type { CriativoView } from '@/lib/design/types'


export function criativoEmFoco(
  criativos: readonly CriativoView[],
  focoId: string | null,
): CriativoView | null {
  return (
    criativos.find((c) => c.id === focoId)
    ?? criativos.find((c) => c.status !== 'arquivada')
    ?? criativos[0]
    ?? null
  )
}


export function idEmFoco(criativos: readonly CriativoView[], focoId: string | null): string | null {
  return criativoEmFoco(criativos, focoId)?.id ?? null
}
