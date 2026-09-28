














import { insertNotificacao, type InsertNotificacaoInput } from '@/data/notificacoes'

export type NotificarInput = InsertNotificacaoInput


export async function notificar(input: NotificarInput): Promise<{ created: boolean }> {
  try {
    const r = await insertNotificacao(input)
    return { created: r.created }
  } catch (err) {
    console.warn('[proativo/notificar] falhou (fail-open):', err)
    return { created: false }
  }
}
