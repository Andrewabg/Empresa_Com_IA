
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { hashPrompt } from '@/lib/persona-hash'
import { HASHES_PERSONA_DE_FABRICA } from '@/server/agent/personaFabrica'

const CAMINHO = 'src/server/agent/persona.ts'

const DIR = 'src/__personas_shipadas__'

const git = (args: string[]): string =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim()


function blobsPorTag(): Map<string, string[]> {
  const porBlob = new Map<string, string[]>()
  for (const tag of git(['tag', '--sort=v:refname']).split('\n').filter(Boolean)) {
    let blob: string
    try {
      blob = git(['rev-parse', `${tag}:${CAMINHO}`])
    } catch {
      continue 
    }
    if (!porBlob.has(blob)) porBlob.set(blob, [])
    porBlob.get(blob)!.push(tag)
  }
  return porBlob
}


async function main(): Promise<number> {
  const porBlob = blobsPorTag()
  if (porBlob.size === 0) {
    console.error('[personas] nenhuma tag com persona.ts — o repo tem as tags? (git fetch --tags)')
    return 1
  }

  rmSync(DIR, { recursive: true, force: true })
  mkdirSync(DIR, { recursive: true })
  try {
    const materializados: { modulo: string; tags: string[] }[] = []
    let i = 0
    for (const [blob, tags] of porBlob) {
      const nome = `p${i++}`
      writeFileSync(`${DIR}/${nome}.ts`, git(['cat-file', '-p', blob]))
      materializados.push({ modulo: nome, tags })
    }

    let faltando = 0
    for (const { modulo, tags } of materializados) {
      const mod = (await import(`@/__personas_shipadas__/${modulo}`)) as { JARVIS_PERSONA: string }
      const h = hashPrompt(mod.JARVIS_PERSONA)
      const ok = HASHES_PERSONA_DE_FABRICA.includes(h)
      if (!ok) faltando++
      const faixa = tags.length === 1 ? tags[0] : `${tags[0]}..${tags[tags.length - 1]}`
      console.log(`${ok ? 'OK   ' : 'FALTA'} ${h}  ${String(mod.JARVIS_PERSONA.length).padStart(5)} chars  ${faixa}`)
    }

    console.log('')
    if (faltando > 0) {
      console.error(
        `[personas] ${faltando} persona(s) JÁ SHIPADA(S) não está(ão) em HASHES_PERSONA_DE_FABRICA.\n` +
          '           Esses installs seriam lidos como personalizados e congelariam.\n' +
          `           Adicione o(s) hash(es) acima em src/server/agent/personaFabrica.ts.`,
      )
      return faltando
    }
    console.log(`[personas] as ${materializados.length} personas já shipadas são reconhecidas pela guarda.`)
    return 0
  } finally {
    rmSync(DIR, { recursive: true, force: true })
  }
}

main()
  .then((faltando) => process.exit(faltando > 0 ? 1 : 0))
  .catch((e) => {
    console.error(e)
    rmSync(DIR, { recursive: true, force: true })
    process.exit(1)
  })
