




export function supabaseRefFromUrl(url?: string): string | null {
  if (!url) return null
  try {
    const host = new URL(url).hostname
    const m = host.match(/^([a-z0-9]+)\.supabase\.co$/i)
    return m ? m[1] : null
  } catch {
    return null
  }
}


export function poolerHintTemplate(ref: string | null): string {
  const r = ref ?? '<SEU-REF>'
  return `postgresql://postgres.${r}:[SUA-SENHA]@aws-0-<REGIÃO>.pooler.supabase.com:5432/postgres`
}
