
import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { serverDb } from '@/server/supabase'
import { getImportWithFiles, setImageStatus } from '@/data/imports'
import { signedImagemUrl } from '@/server/imports/imageStorage'
import { runImportHeartbeat } from '@/server/imports/heartbeat'
import { parseImageN, parseAcao, acaoParaStatus } from '@/lib/imports/imageAction'
import type { ImportFileRow } from '@/data/imports'
import type { ImageRef } from '@/lib/imports/imageTriage'


async function resolverAlvo(
  params: Promise<{ id: string; n: string }>,
): Promise<Response | { db: ReturnType<typeof serverDb>; f: ImportFileRow; ref: ImageRef & { storage_path: string } }> {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth

  const { id, n: nRaw } = await params
  const n = parseImageN(nRaw)
  if (n === null) return Response.json({ error: 'Imagem inválida.' }, { status: 400 })

  const db = serverDb()
  const result = await getImportWithFiles(db, id)
  if (!result) return Response.json({ error: 'Lote não encontrado.' }, { status: 404 })

  
  for (const f of result.files) {
    const ref = (f.image_refs ?? []).find((r) => r.n === n && !!r.storage_path)
    if (ref) return { db, f, ref: ref as ImageRef & { storage_path: string } }
  }
  return Response.json({ error: 'Imagem não encontrada.' }, { status: 404 })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; n: string }> },
) {
  const alvo = await resolverAlvo(params)
  if (alvo instanceof Response) return alvo

  const { db, ref } = alvo
  return Response.json({ url: await signedImagemUrl(db, ref.storage_path) })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; n: string }> },
) {
  const alvo = await resolverAlvo(params)
  if (alvo instanceof Response) return alvo

  const { db, f, ref } = alvo
  const body = await request.json().catch(() => ({}))
  const acao = parseAcao(body)
  if (acao === null) return Response.json({ error: 'Ação inválida.' }, { status: 400 })

  await setImageStatus(db, f.id, ref.n, { status: acaoParaStatus(acao) })
  
  if (acao === 'ler') void runImportHeartbeat()

  
  const { id } = await params
  const fresco = await getImportWithFiles(db, id)
  const arquivo = fresco?.files.find((x) => x.id === f.id)
  return Response.json({ image_refs: arquivo?.image_refs ?? [] })
}
