


export type ProviderOptions = Record<string, Record<string, string>>


export const DEFAULT_MAIN_MODEL = 'gpt-5.1'
export const DEFAULT_CHEAP_MODEL = 'gpt-5-mini'


export function isReasoningModel(model: string): boolean {
  return /^gpt-5(\.|-|$)/.test(model)
}


export function backgroundProviderOptions(model: string): ProviderOptions {
  if (!isReasoningModel(model)) return {}
  return { openai: { reasoningEffort: 'minimal', textVerbosity: 'low' } }
}


export const BACKGROUND_MAX_OUTPUT = 900

export const EXTRACTION_MAX_OUTPUT = 1500

export const EXTRACTION_MAX_OUTPUT_RETRY = EXTRACTION_MAX_OUTPUT * 2


export function cheapModel(env: { CHEAP_MODEL?: string; OPENAI_MODEL?: string }): string {
  return env.CHEAP_MODEL || DEFAULT_CHEAP_MODEL
}


export function mainModel(env: { OPENAI_MODEL?: string }): string {
  return env.OPENAI_MODEL || DEFAULT_MAIN_MODEL
}


export function isModelNotFoundError(err: unknown): boolean {
  const anyErr = err as { status?: number; statusCode?: number; code?: string; message?: string } | null
  if (!anyErr) return false
  const status = anyErr.status ?? anyErr.statusCode
  const msg = (anyErr.message ?? '').toLowerCase()
  const code = (anyErr.code ?? '').toLowerCase()
  if (code === 'model_not_found') return true
  const looksLikeModelMsg =
    msg.includes('model_not_found') ||
    msg.includes('does not exist') ||
    msg.includes('do not have access to model') ||
    (msg.includes('model') && msg.includes('not found'))
  
  return looksLikeModelMsg && (status === undefined || status === 404 || status === 400)
}
