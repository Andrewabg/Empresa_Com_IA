






export interface HiringUsage {
  in: number
  out: number
  cached: number
}


function stepUsage(chunk: unknown): { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number } | undefined {
  return (chunk as { payload?: { output?: { usage?: { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number } } } })
    .payload?.output?.usage
}

function chunkType(chunk: unknown): string | undefined {
  return (chunk as { type?: unknown })?.type as string | undefined
}


export function somarUsage(chunks: Iterable<unknown>): HiringUsage {
  let inTok = 0
  let outTok = 0
  let cached = 0
  for (const chunk of chunks) {
    if (chunkType(chunk) !== 'step-finish') continue
    const usage = stepUsage(chunk)
    inTok += usage?.inputTokens ?? 0
    outTok += usage?.outputTokens ?? 0
    cached += usage?.cachedInputTokens ?? 0
  }
  return { in: inTok, out: outTok, cached }
}
