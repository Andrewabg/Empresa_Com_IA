
import { generateObject, generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import type { z } from 'zod'
import { getSecret, SECRET_KEYS } from '../secrets'
import { NotConfiguredError } from '../brain/runtime'
import { backgroundProviderOptions, isModelNotFoundError, isReasoningModel, cheapModel, mainModel } from '@/lib/llm-tuning'



export interface BgUsage { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number }





export interface BgGenResult { object: unknown; usage: BgUsage; model: string; finishReason?: string }
export interface BgTextResult { text: string; usage: BgUsage; model: string; finishReason?: string }


export async function withModelFallback(
  cheap: string,
  main: string,
  run: (model: string) => Promise<{ object: unknown; usage: BgUsage; finishReason?: string }>,
): Promise<BgGenResult> {
  try {
    const r = await run(cheap)
    return { object: r.object, usage: r.usage, model: cheap, finishReason: r.finishReason }
  } catch (e) {
    if (cheap !== main && isModelNotFoundError(e)) {
      const r = await run(main)
      return { object: r.object, usage: r.usage, model: main, finishReason: r.finishReason }
    }
    throw e
  }
}


export async function withModelFallbackText(
  cheap: string,
  main: string,
  run: (model: string) => Promise<{ text: string; usage: BgUsage; finishReason?: string }>,
): Promise<BgTextResult> {
  try {
    const r = await run(cheap)
    return { text: r.text, usage: r.usage, model: cheap, finishReason: r.finishReason }
  } catch (e) {
    if (cheap !== main && isModelNotFoundError(e)) {
      const r = await run(main)
      return { text: r.text, usage: r.usage, model: main, finishReason: r.finishReason }
    }
    throw e
  }
}


export function backgroundModels(): { cheap: string; main: string } {
  
  
  const e = { CHEAP_MODEL: process.env.CHEAP_MODEL, OPENAI_MODEL: process.env.OPENAI_MODEL }
  return { cheap: cheapModel(e), main: mainModel(e) }
}


export async function generateBackgroundObject(args: {
  schema: z.ZodTypeAny
  prompt: string
  maxOutputTokens?: number
  reasoningEffort?: string
}): Promise<BgGenResult> {
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) throw new NotConfiguredError(['openai_api_key'])
  const openai = createOpenAI({ apiKey })
  const { cheap, main } = backgroundModels()
  return withModelFallback(cheap, main, async (model) => {
    
    
    const po = backgroundProviderOptions(model)
    if (args.reasoningEffort && isReasoningModel(model)) {
      po.openai = { ...po.openai, reasoningEffort: args.reasoningEffort }
    }
    const { object, usage, finishReason } = await generateObject({
      model: openai(model),
      schema: args.schema,
      prompt: args.prompt,
      maxOutputTokens: args.maxOutputTokens,
      providerOptions: po,
    })
    return { object, usage, finishReason }
  })
}


export async function generateBackgroundVision(args: {
  prompt: string
  image: Uint8Array
  mediaType: string
  maxOutputTokens?: number
}): Promise<BgTextResult> {
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) throw new NotConfiguredError(['openai_api_key'])
  const openai = createOpenAI({ apiKey })
  const { cheap, main } = backgroundModels()
  return withModelFallbackText(cheap, main, async (model) => {
    const { text, usage, finishReason } = await generateText({
      model: openai(model),
      messages: [{ role: 'user', content: [
        { type: 'text', text: args.prompt },
        { type: 'image', image: args.image, mediaType: args.mediaType },
      ] }],
      maxOutputTokens: args.maxOutputTokens,
      providerOptions: backgroundProviderOptions(model),
    })
    return { text, usage, finishReason }
  })
}
