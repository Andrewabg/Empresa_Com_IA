
export const PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  
  'gpt-5.1': { inputPer1M: 1.25, outputPer1M: 10.0 },

  
  'gpt-5.5': { inputPer1M: 5.0, outputPer1M: 30.0 },

  
  
  
  
  'gpt-5-mini': { inputPer1M: 0.25, outputPer1M: 2.0 },

  
  
  
  
  
  
  'gpt-5.6-luna': { inputPer1M: 0.2, outputPer1M: 1.2 },

  
  'gpt-4.1': { inputPer1M: 2.0, outputPer1M: 8.0 },

  
  'text-embedding-3-small': { inputPer1M: 0.02, outputPer1M: 0 },

  
  'gpt-4o-transcribe': { inputPer1M: 2.5, outputPer1M: 10.0 },

  
  
  
  'gpt-image-2': { inputPer1M: 8.0, outputPer1M: 30.0 },

  
  
  
  'gpt-4o-mini-tts': { inputPer1M: 0.6, outputPer1M: 12.0 },
}


const CACHED_INPUT_RATE = 0.1


export function costUsd(model: string, inTok: number, outTok: number, cachedTok = 0): number {
  const pricing =
    PRICING[model] ??
    Object.entries(PRICING).find(([k]) => model.startsWith(k))?.[1]
  if (!pricing) {
    console.warn(`[costUsd] Unknown model: "${model}" — returning 0`)
    return 0
  }
  const cached = Math.min(Math.max(cachedTok, 0), inTok) 
  return (
    ((inTok - cached) / 1e6) * pricing.inputPer1M +
    (cached / 1e6) * pricing.inputPer1M * CACHED_INPUT_RATE +
    (outTok / 1e6) * pricing.outputPer1M
  )
}


export const REALTIME_PRICING = {
  audioInPer1M: 32,
  audioOutPer1M: 64,
  textInPer1M: 4,
  textOutPer1M: 16,
  
  cachedInPer1M: 0.4,
} as const

export interface RealtimeUsage {
  
  input_tokens?: number
  output_tokens?: number
  input_token_details?: {
    text_tokens?: number
    audio_tokens?: number
    
    cached_tokens?: number
    
    cached_tokens_details?: { text_tokens?: number; audio_tokens?: number }
  }
  output_token_details?: { text_tokens?: number; audio_tokens?: number }
}


export function repartirCacheDeEntrada(
  cached: number,
  textIn: number,
  audioIn: number,
  detalhe?: { text_tokens?: number; audio_tokens?: number },
): { texto: number; audio: number } {
  const total = textIn + audioIn
  const teto = Math.min(Math.max(cached, 0), total) 
  if (teto === 0) return { texto: 0, audio: 0 }
  if (detalhe && (detalhe.text_tokens !== undefined || detalhe.audio_tokens !== undefined)) {
    return {
      texto: Math.min(detalhe.text_tokens ?? 0, textIn),
      audio: Math.min(detalhe.audio_tokens ?? 0, audioIn),
    }
  }
  const texto = total === 0 ? 0 : (teto * textIn) / total
  return { texto, audio: teto - texto }
}


export function costRealtimeUsd(usage: RealtimeUsage): number {
  const i = usage.input_token_details ?? {}
  const o = usage.output_token_details ?? {}
  const audioIn = i.audio_tokens ?? 0
  const textIn = i.text_tokens ?? 0
  const audioOut = o.audio_tokens ?? 0
  const textOut = o.text_tokens ?? 0

  const cache = repartirCacheDeEntrada(i.cached_tokens ?? 0, textIn, audioIn, i.cached_tokens_details)
  const textoNovo = Math.max(0, textIn - cache.texto)
  const audioNovo = Math.max(0, audioIn - cache.audio)

  return (
    (audioNovo / 1e6) * REALTIME_PRICING.audioInPer1M +
    (textoNovo / 1e6) * REALTIME_PRICING.textInPer1M +
    ((cache.texto + cache.audio) / 1e6) * REALTIME_PRICING.cachedInPer1M +
    (audioOut / 1e6) * REALTIME_PRICING.audioOutPer1M +
    (textOut / 1e6) * REALTIME_PRICING.textOutPer1M
  )
}






