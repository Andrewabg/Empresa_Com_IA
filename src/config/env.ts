import { z } from 'zod'
import { DEFAULT_MAIN_MODEL, DEFAULT_CHEAP_MODEL } from '@/lib/llm-tuning'

const Schema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1).optional(),
  GITHUB_TOKEN: z.string().optional(),
  BRAIN_REPO: z.string().optional(),
  BRAIN_BRANCH: z.string().default('main'),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  OPENAI_MODEL: z.string().default(DEFAULT_MAIN_MODEL),
  
  
  CHEAP_MODEL: z.string().default(DEFAULT_CHEAP_MODEL),
})

const result = Schema.safeParse(process.env)
if (!result.success) {
  throw new Error(`[env] Variáveis de ambiente inválidas:\n${result.error.toString()}`)
}
export const env = result.data
