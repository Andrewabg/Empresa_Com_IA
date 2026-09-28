

import { z } from 'zod'
import type { FichaJuridicaPatch } from '@/lib/juridico/ficha'

export const FichaPatchSchema = z.object({
  razaoSocial: z.string(), cnpj: z.string(), endereco: z.string(), representante: z.string(),
  foro: z.string(), posturas: z.array(z.string()), observacoes: z.string(),
  aprendizados: z.array(z.string()),
})

export function toFichaPatch(o: z.infer<typeof FichaPatchSchema>): FichaJuridicaPatch {
  return {
    razaoSocial: o.razaoSocial || undefined, cnpj: o.cnpj || undefined,
    endereco: o.endereco || undefined, representante: o.representante || undefined,
    foro: o.foro || undefined, posturas: o.posturas, observacoes: o.observacoes || undefined,
    aprendizados: o.aprendizados.filter(Boolean).map((texto) => ({ texto })),
  }
}
