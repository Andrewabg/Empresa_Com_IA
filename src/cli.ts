import { env } from './config/env'
import { db } from './db/client'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ResilientBrainRepo } from './server/brain/resilientRepo'
import { Sync } from './brain/sync'
import { Search } from './brain/search'
import { Embedder, OpenAIEmbedClient } from './brain/embeddings'
import { Curator } from './brain/curator/curator'
import { Committer } from './brain/curator/commit'
import { OpenAIDecideClient } from './brain/curator/consolidate'
import { marcarInelegiveisComoDescartadas, portaoFechou } from './server/brain/candidatasElegiveis'
import { reconcileResilient } from './server/brain/reconcileResilient'

function makeEmbedder() {
  return new Embedder(new OpenAIEmbedClient(env.EMBEDDING_MODEL), env.EMBEDDING_MODEL)
}
async function cloneBrain(): Promise<ResilientBrainRepo> {
  if (!env.BRAIN_REPO) throw new Error('BRAIN_REPO não configurado no .env')
  const dir = mkdtempSync(join(tmpdir(), 'awave-brain-'))
  const remote = env.GITHUB_TOKEN
    ? `https://${env.GITHUB_TOKEN}@github.com/${env.BRAIN_REPO}.git`
    : `https://github.com/${env.BRAIN_REPO}.git`
  return ResilientBrainRepo.clone(remote, dir, env.BRAIN_BRANCH)
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2)
  const embedder = makeEmbedder()
  switch (cmd) {
    case 'sync':
    case 'rebuild': {
      const repo = await cloneBrain()
      await new Sync(db, repo, embedder).syncFull()
      console.log(`${cmd} (full) concluído`)
      break
    }
    case 'reindex': {
      const repo = await cloneBrain()
      const mode = await reconcileResilient(db, repo, new Sync(db, repo, embedder), embedder.version())
      console.log('reindex:', mode)
      break
    }
    case 'search': {
      const hits = await new Search(db, embedder).search(rest.join(' '), 10)
      if (!hits.length) console.log('(nenhum resultado)')
      for (const h of hits) console.log(`${h.score.toFixed(3)}  ${h.path} — ${h.content.slice(0, 80)}`)
      break
    }
    case 'curate': {
      const repo = await cloneBrain()
      const committer = new Committer(repo.dir, { repoSlug: env.BRAIN_REPO })
      
      
      
      
      
      
      
      const portao = await marcarInelegiveisComoDescartadas(db)
      if (!portaoFechou(portao)) {
        console.error(
          `portão de origem não fechou (leu=${portao.leu}, ${portao.marcadas} de ${portao.recusas.length} marcadas): ` +
          'curate abortado para o Curador não consumir a fila não filtrada. Tente de novo quando o banco responder.',
        )
        process.exit(1)
      }
      
      
      
      await new Curator(db, repo, new Search(db, embedder), new OpenAIDecideClient(env.OPENAI_MODEL), committer).run()
      console.log('curate concluído')
      break
    }
    default:
      console.log('uso: pnpm tsx src/cli.ts <sync|reindex|rebuild|search "<q>"|curate>')
  }
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1) })
