


export function valorUtil(v: string | null | undefined): string | undefined {
  const s = v?.trim()
  if (!s || s === 'undefined' || s === 'null') return undefined
  return s
}


export function primeiroValorUtil(
  ...candidatos: Array<string | null | undefined>
): string | undefined {
  for (const c of candidatos) {
    const v = valorUtil(c)
    if (v) return v
  }
  return undefined
}


export interface ConexaoSupabase {
  url?: string
  anonKey?: string
}


export function conexaoSupabaseDoAmbiente(): ConexaoSupabase {
  const env = process.env as Record<string, string | undefined>
  return {
    url: primeiroValorUtil(
      env['SUPABASE_URL'],
      env['NEXT_PUBLIC_SUPABASE_URL'],
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    anonKey: primeiroValorUtil(
      env['SUPABASE_ANON_KEY'],
      env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  }
}


export const SCRIPT_CONEXAO_ID = 'awave-supabase-config'


export const AVISO_SEM_CONEXAO = {
  titulo: 'Falta a conexão com o Supabase',
  corpo:
    'O app subiu, mas não recebeu o endereço do seu projeto Supabase. Preencha SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e NEXT_PUBLIC_SUPABASE_ANON_KEY nas variáveis de ambiente do painel onde você hospeda e reinicie o app.',
  rodape: 'Os valores estão no Supabase, em Settings e depois API.',
}


export function serializarConexao(conexao: ConexaoSupabase): string {
  return JSON.stringify(conexao).replace(/</g, '\\u003c')
}


export function desserializarConexao(texto: string | null | undefined): ConexaoSupabase {
  if (!texto) return {}
  try {
    const bruto = JSON.parse(texto) as unknown
    if (!bruto || typeof bruto !== 'object') return {}
    const { url, anonKey } = bruto as Record<string, unknown>
    return {
      url: valorUtil(typeof url === 'string' ? url : undefined),
      anonKey: valorUtil(typeof anonKey === 'string' ? anonKey : undefined),
    }
  } catch {
    return {}
  }
}
