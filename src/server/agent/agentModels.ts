import { PRICING } from '../cost/pricing'


const NAO_CHAT = new Set(['gpt-4o-transcribe', 'gpt-image-2', 'gpt-4o-mini-tts'])
export const AGENT_MODELS: string[] = Object.entries(PRICING)
  .filter(([m, p]) => p.outputPer1M > 0 && !NAO_CHAT.has(m))
  .map(([m]) => m)

export function isAllowedModel(model: string): boolean {
  return AGENT_MODELS.includes(model)
}
