import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi, requireDonoApi } from '@/server/auth/apiAuth'
import { getUpdateStatus } from '@/server/updates/status'
import { getSecret, setSecret, invalidateSecretsCache, SECRET_KEYS } from '@/server/secrets'




const REPO_RE = /^[\w.-]+\/[\w.-]+$/


function normalizeRepo(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/\.git$/, '')
}





export async function GET() {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  try {
    return NextResponse.json(await getUpdateStatus())
  } catch {
    return NextResponse.json({ error: 'Falha ao ler o estado de atualização.' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth

  const body = (await req.json().catch(() => null)) as
    | { update_repo?: unknown; easypanel_deploy_webhook?: unknown }
    | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 })
  }

  let wrote = false

  
  if ('update_repo' in body && body.update_repo !== undefined) {
    const v = body.update_repo
    if (typeof v !== 'string' || !REPO_RE.test(v.trim())) {
      return NextResponse.json(
        { error: 'Repo inválido — use o formato owner/nome (ex.: fulano/awave-motor).' },
        { status: 400 },
      )
    }
    
    
    
    const brainRepo = await getSecret(SECRET_KEYS.github_repo)
    if (brainRepo && normalizeRepo(v) === normalizeRepo(brainRepo)) {
      return NextResponse.json(
        { error: 'O repositório do Motor não pode ser o mesmo do Cérebro.' },
        { status: 400 },
      )
    }
    await setSecret(SECRET_KEYS.update_repo, v.trim())
    wrote = true
  }

  
  if ('easypanel_deploy_webhook' in body && body.easypanel_deploy_webhook !== undefined) {
    const v = body.easypanel_deploy_webhook
    if (typeof v !== 'string' || (v !== '' && !isHttpUrl(v.trim()))) {
      return NextResponse.json(
        { error: 'Webhook inválido — informe uma URL http(s) ou deixe vazio para limpar.' },
        { status: 400 },
      )
    }
    await setSecret(SECRET_KEYS.easypanel_deploy_webhook, v === '' ? '' : v.trim())
    wrote = true
  }

  if (wrote) invalidateSecretsCache()

  
  const repo = await getSecret(SECRET_KEYS.update_repo)
  return NextResponse.json({ ok: true, repoConfigured: Boolean(repo) })
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
