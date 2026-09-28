import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { papelPodeAcessar, type Papel } from '@/lib/equipe'
import { AVISO_SEM_CONEXAO, conexaoSupabaseDoAmbiente } from '@/lib/env-supabase'




async function checkMembership(userId: string): Promise<Papel | null | 'error'> {
  const supabaseUrl = conexaoSupabaseDoAmbiente().url
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return 'error'
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3000)
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/papel_do_membro`, {
      method: 'POST',
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_uid: userId }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) return 'error'
    const papel = (await res.json()) as Papel | null
    return papel ?? null
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn('[middleware] papel_do_membro falhou — fail-open:', err)
    return 'error'
  }
}


function respostaSemConexao(): NextResponse {
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${AVISO_SEM_CONEXAO.titulo}</title></head>
<body style="margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#0A0B0D;color:#E6E7E9;font-family:system-ui,-apple-system,Segoe UI,sans-serif">
<main style="max-width:520px;padding:32px;line-height:1.6">
<h1 style="margin:0 0 12px;font-size:19px;font-weight:600">${AVISO_SEM_CONEXAO.titulo}</h1>
<p style="margin:0 0 12px;font-size:14px;color:#A1A4AB">${AVISO_SEM_CONEXAO.corpo}</p>
<p style="margin:0;font-size:13px;color:#6F737B">${AVISO_SEM_CONEXAO.rodape}</p>
</main></body></html>`
  return new NextResponse(html, {
    status: 503,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  })
}

let _bornOnce = false

async function checkIsBorn(): Promise<boolean> {
  if (_bornOnce) return true
  const supabaseUrl = conexaoSupabaseDoAmbiente().url
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('[middleware] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — skipping born gate')
    return true 
  }
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3000)
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/is_born`, {
      method: 'POST',
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
      body: '{}',
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) {
      console.warn(`[middleware] is_born returned HTTP ${res.status} — fail-open`)
      return true 
    }
    const born: boolean = await res.json()
    if (born) _bornOnce = true
    return born
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn('[middleware] is_born fetch failed — fail-open:', err)
    return true 
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  
  if (
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname === '/onboarding' ||
    pathname.startsWith('/onboarding/') ||
    pathname.startsWith('/api/onboarding') ||
    pathname.startsWith('/convite') ||   
    pathname === '/api/health' ||
    pathname === '/api/github/webhook' ||
    pathname.startsWith('/api/hooks/') ||          
    /^\/api\/canais\/[^/]+\/webhook(\/|$)/.test(pathname) || 
    pathname === '/api/heartbeat' ||               
    pathname === '/api/telegram/poll' ||           
    pathname === '/api/license' ||             
    pathname === '/api/trafego/meta-health' || 
    pathname.startsWith('/api/config')
  ) {
    return NextResponse.next()
  }

  
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  
  
  
  const { url: supabaseUrl, anonKey } = conexaoSupabaseDoAmbiente()
  if (!supabaseUrl || !anonKey) {
    console.error('[middleware] sem conexão Supabase (SUPABASE_URL / anon key) — respondendo 503')
    return respostaSemConexao()
  }

  
  
  
  
  const supabase = createServerClient(
    supabaseUrl,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          
          response = NextResponse.next({
            request,
          })
          
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
      
      
      cookieOptions: { sameSite: 'lax', secure: process.env.NODE_ENV === 'production' },
    },
  )

  
  
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    
    
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  
  const papel = await checkMembership(user.id)
  if (papel === null) {
    
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'; loginUrl.search = ''
    loginUrl.searchParams.set('error', 'Acesso restrito à equipe.')
    return NextResponse.redirect(loginUrl)
  }
  
  
  
  if (papel !== 'error' && !papelPodeAcessar(papel, pathname)) {
    const home = request.nextUrl.clone()
    home.pathname = '/'; home.search = ''
    return NextResponse.redirect(home)
  }

  
  
  
  const born = await checkIsBorn()
  if (!born) {
    const onboardingUrl = request.nextUrl.clone()
    onboardingUrl.pathname = '/onboarding'
    return NextResponse.redirect(onboardingUrl)
  }

  return response
}

export const config = {
  matcher: [
    
    '/((?!_next/static|_next/image|favicon.ico|api/cerebro/import|api/conversa/anexos|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|css|js)$).*)',
  ],
}
