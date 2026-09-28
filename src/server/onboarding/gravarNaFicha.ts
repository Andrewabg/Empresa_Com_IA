
import { upsertFatoEmpresa } from '@/data/fichaEmpresa'
import { slugFato, type FatoEmpresa } from '@/lib/memory/fichaEmpresa'
import { fatoDoTopico } from '@/lib/onboarding/fatoDoTopico'
import { fatosDeIdentidade, type IdentidadeParcial } from '@/lib/onboarding/fatosIdentidade'
import { motivoSeguro } from '@/lib/sanitizarErro'


export type UpsertFato = (fato: FatoEmpresa) => Promise<void>


export async function gravarFatoDoSlot(
  args: { topicId: string; valor: string; at: string },
  upsert: UpsertFato = upsertFatoEmpresa,
): Promise<void> {
  const mapeado = fatoDoTopico(args.topicId)
  if (!mapeado || !args.valor?.trim()) return
  try {
    await upsert({
      id: slugFato(mapeado.rotulo),
      rotulo: mapeado.rotulo,
      valor: args.valor,
      categoria: mapeado.categoria,
      fonte: 'operador',
      at: args.at,
    })
  } catch (err) {
    console.warn(
      `[gravarFatoDoSlot] fato '${args.topicId}' não entrou na Ficha (a captura do dono segue guardada na sessão):`,
      motivoSeguro(err),
    )
  }
}


export async function gravarFatosIdentidade(
  identidade: IdentidadeParcial,
  at: string,
  upsert: UpsertFato = upsertFatoEmpresa,
): Promise<void> {
  for (const fato of fatosDeIdentidade(identidade, at)) {
    try {
      await upsert(fato)
    } catch (err) {
      console.warn(`[gravarFatosIdentidade] fato '${fato.id}' não entrou na Ficha (a identidade já está salva):`, motivoSeguro(err))
    }
  }
}
