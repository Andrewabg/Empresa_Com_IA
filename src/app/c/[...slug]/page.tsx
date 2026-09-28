




import { notFound } from 'next/navigation'
import { getCustomPages } from '@/server/custom/registryPages'
import { encontrarPorSlug } from '@/lib/custom-registry-validate'

export const dynamic = 'force-dynamic'

export default async function PaginaCustomRoute({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const alvo = encontrarPorSlug(getCustomPages(), slug)
  if (!alvo) notFound()
  const { Componente } = alvo
  return <Componente />
}
