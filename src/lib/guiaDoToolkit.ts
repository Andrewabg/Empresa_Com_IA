


const GUIA_BASE = 'https://elitedaia.com.br/guia/empresa-ia'


const GUIAS: Record<string, string> = {
  metaads: `${GUIA_BASE}/ferramentas/conectar-meta-ads`,
  meta_ads: `${GUIA_BASE}/ferramentas/conectar-meta-ads`,
  facebook_ads: `${GUIA_BASE}/ferramentas/conectar-meta-ads`,
}


export function guiaDoToolkit(slug: string | null | undefined): string | null {
  if (typeof slug !== 'string') return null
  return GUIAS[slug.trim().toLowerCase()] ?? null
}
