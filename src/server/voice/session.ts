

export const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL ?? 'gpt-realtime'




export const REALTIME_VOICE = process.env.OPENAI_REALTIME_VOICE ?? 'cedar'
const CLIENT_SECRETS_URL = 'https://api.openai.com/v1/realtime/client_secrets'

export interface MintDeps {
  getSummary: () => Promise<{ spentUsd: number; budgetUsd: number }>
  getApiKey: () => Promise<string | null>
  fetchImpl?: typeof fetch
}

export type MintResult =
  | { ephemeralKey: string; expiresAt: number | null; model: string; voice: string }
  | { budgetExceeded: true }
  | { needsConfig: true }


const INSTRUCOES_DE_TRANSPORTE =
  'Fale em português do Brasil. Quando receber uma instrução para dizer algo, diga ' +
  'exatamente aquele texto, palavra por palavra, sem acrescentar nem remover nada.'

export interface SessionOpts {
  
  voice?: string
}


export async function realtimeSessionConfig(opts: SessionOpts = {}) {
  return {
    type: 'realtime' as const,
    model: REALTIME_MODEL,
    
    
    
    instructions: INSTRUCOES_DE_TRANSPORTE,
    
    
    output_modalities: ['audio'] as const,
    audio: {
      input: {
        
        transcription: { model: 'gpt-4o-transcribe', language: 'pt' },
        
        
        turn_detection: null,
      },
      output: { voice: opts.voice ?? REALTIME_VOICE },
    },
    
    
    
    tools: [] as const,
  }
}


export async function mintRealtimeSession(deps: MintDeps, opts: SessionOpts = {}): Promise<MintResult> {
  const { spentUsd, budgetUsd } = await deps.getSummary()
  
  
  
  if (budgetUsd > 0 && spentUsd >= budgetUsd) return { budgetExceeded: true }

  const apiKey = await deps.getApiKey()
  if (!apiKey) return { needsConfig: true }

  const doFetch = deps.fetchImpl ?? fetch
  const session = await realtimeSessionConfig(opts)
  const res = await doFetch(CLIENT_SECRETS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ session }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`mintRealtimeSession: client_secrets ${res.status} ${detail.slice(0, 200)}`)
  }
  
  
  const data = (await res.json()) as { value?: string; expires_at?: number }
  const value = data.value
  if (!value) throw new Error('mintRealtimeSession: resposta sem value (token efêmero)')

  return {
    ephemeralKey: value,
    expiresAt: data.expires_at ?? null,
    model: REALTIME_MODEL,
    voice: opts.voice ?? REALTIME_VOICE,
  }
}
