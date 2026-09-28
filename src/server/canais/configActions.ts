
import { GRAPH_BASE } from './providers/whatsappCloud'
import { getCanalByExternalId as getByExtDefault, createCanal as createDefault, updateCanal as updateDefault, type CanalModo } from '@/data/canais'

export interface NumeroWaba { external_id: string; rotulo: string; nome: string }

export async function listarNumerosWaba(
  input: { wabaId: string; token: string },
  deps: { fetchFn?: typeof fetch } = {},
): Promise<{ ok: true; numeros: NumeroWaba[] } | { ok: false; detail: string }> {
  const fetchFn = deps.fetchFn ?? fetch
  try {
    const res = await fetchFn(`${GRAPH_BASE}/${input.wabaId}/phone_numbers`, {
      headers: { Authorization: `Bearer ${input.token}` },
    })
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
      return { ok: false, detail: j?.error?.message ?? `HTTP ${res.status}` }
    }
    const j = (await res.json()) as { data?: Array<{ id?: string; display_phone_number?: string; verified_name?: string }> }
    const numeros = (j.data ?? [])
      .filter((n) => n.id)
      .map((n) => ({ external_id: n.id as string, rotulo: n.display_phone_number ?? '', nome: n.verified_name ?? '' }))
    return { ok: true, numeros }
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) }
  }
}

export async function vincularNumero(
  input: { external_id: string; rotulo: string; agent_id: string; modo: CanalModo },
  deps: { getCanalByExternalId?: typeof getByExtDefault; createCanal?: typeof createDefault; updateCanal?: typeof updateDefault } = {},
): Promise<{ ok: true; canalId: string }> {
  const getByExt = deps.getCanalByExternalId ?? getByExtDefault
  const create = deps.createCanal ?? createDefault
  const update = deps.updateCanal ?? updateDefault
  const existente = await getByExt(input.external_id)
  if (existente) {
    await update(existente.id, { rotulo: input.rotulo, agent_id: input.agent_id, modo: input.modo })
    return { ok: true, canalId: existente.id }
  }
  const novo = await create({ tipo: 'whatsapp', external_id: input.external_id, rotulo: input.rotulo, agent_id: input.agent_id, modo: input.modo })
  return { ok: true, canalId: novo.id }
}
