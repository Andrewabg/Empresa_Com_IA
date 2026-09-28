



import { getSecret, SECRET_KEYS } from '@/server/secrets'

export interface TranscreverUsage { input_tokens?: number; output_tokens?: number; prompt_tokens?: number }
export interface TranscreverResult { text: string; usage?: TranscreverUsage | null }
export interface TranscreverDeps {
  getApiKey?: () => Promise<string | null>
  fetchImpl?: typeof fetch
}

export async function transcreverBytes(
  input: { bytes: Uint8Array; mime: string },
  deps: TranscreverDeps = {},
): Promise<TranscreverResult | null> {
  const getApiKey = deps.getApiKey ?? (() => getSecret(SECRET_KEYS.openai_api_key))
  const fetchImpl = deps.fetchImpl ?? fetch
  try {
    const apiKey = await getApiKey()
    if (!apiKey) return null
    const base = input.mime.split(';')[0].trim()        
    const ext = base.split('/')[1] || 'mp4'
    const fd = new FormData()
    fd.append('file', new Blob([Buffer.from(input.bytes)], { type: base }), `criativo.${ext}`)
    fd.append('model', 'gpt-4o-transcribe')
    const res = await fetchImpl('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: fd,
    })
    if (!res.ok) {
      console.warn(`[transcrever] HTTP ${res.status}`)
      return null
    }
    return (await res.json()) as TranscreverResult
  } catch (e) {
    console.warn('[transcrever] falhou (fail-open):', e instanceof Error ? e.message : e)
    return null
  }
}
