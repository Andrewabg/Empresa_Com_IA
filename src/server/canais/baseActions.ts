
import { upsertEntradaBase as upsertDefault, searchBase as searchDefault, replaceChunksEntrada as replaceChunksDefault } from '@/data/baseConhecimento'
import { chunkarEntrada } from '@/lib/canais/chunkBase'
import { embedTexto, embeddingVersionCanais } from './embed'


async function regravarChunks(
  entradaId: string,
  titulo: string,
  conteudo: string,
  ehEdicao: boolean,
  embed: typeof embedTexto,
  replaceChunks: typeof replaceChunksDefault,
): Promise<number> {
  try {
    const pedacos = chunkarEntrada(titulo, conteudo)
    if (pedacos.length === 0) {
      
      
      
      if (ehEdicao) await replaceChunks(entradaId, [])
      return 0
    }
    const comVetor: Array<{ ordem: number; texto: string; embedding: number[] }> = []
    for (const p of pedacos) {
      const embedding = await embed(p.texto)
      if (embedding?.length) comVetor.push({ ...p, embedding })
    }
    
    
    if (comVetor.length !== pedacos.length) return 0
    await replaceChunks(entradaId, comVetor)
    return comVetor.length
  } catch (e) {
    console.warn('[baseActions] chunking da entrada fail-open:', e)
    return 0
  }
}

export async function salvarEntradaBase(
  input: { id?: string; titulo: string; conteudo: string; agent_id: string | null; tipo?: 'fato' | 'playbook'; enabled?: boolean; origem?: 'operador' | 'aprendizado' },
  deps: { embed?: typeof embedTexto; upsert?: typeof upsertDefault; embeddingVersion?: () => string; replaceChunks?: typeof replaceChunksDefault } = {},
): Promise<{ ok: boolean; id?: string }> {
  const titulo = input.titulo.trim()
  const conteudo = input.conteudo.trim()
  if (!titulo || !conteudo) return { ok: false }
  const embed = deps.embed ?? embedTexto
  const upsert = deps.upsert ?? upsertDefault
  const versionOf = deps.embeddingVersion ?? embeddingVersionCanais
  const embedding = await embed(`${titulo}\n${conteudo}`)
  const row = await upsert({
    ...(input.id ? { id: input.id } : {}),
    titulo,
    conteudo,
    agent_id: input.agent_id,
    embedding,
    
    
    embeddingVersion: versionOf(),
    ...(input.tipo !== undefined ? { tipo: input.tipo } : {}),
    ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
    ...(input.origem !== undefined ? { origem: input.origem } : {}),
  })
  await regravarChunks(row.id, titulo, conteudo, Boolean(input.id), embed, deps.replaceChunks ?? replaceChunksDefault)
  return { ok: true, id: row.id }
}


export async function proporEntradaBaseDoCerebro(
  input: { titulo: string; conteudo: string; canalAgentId: string | null },
  deps: { embed?: typeof embedTexto; upsert?: typeof upsertDefault } = {},
): Promise<{ ok: boolean; id?: string }> {
  return salvarEntradaBase(
    {
      titulo: input.titulo,
      conteudo: input.conteudo,
      agent_id: input.canalAgentId, 
      enabled: false,               
      origem: 'aprendizado',
    },
    deps,
  )
}

export async function testarPerguntaBase(
  input: { pergunta: string; agentId: string },
  deps: { embed?: typeof embedTexto; search?: typeof searchDefault } = {},
): Promise<{ resultados: Array<{ titulo: string; conteudo: string; score: number }> }> {
  const embed = deps.embed ?? embedTexto
  const search = deps.search ?? searchDefault
  const embedding = await embed(input.pergunta)
  const resultados = await search({ pergunta: input.pergunta, embedding, agentId: input.agentId, k: 5 })
  return { resultados }
}
