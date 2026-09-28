




import { z } from 'zod'
import { recordCost as recordCostImpl } from '@/data/cost'
import { getFichaJuridica as getFichaImpl } from '@/data/fichaJuridica'
import { getContrato as getContratoImpl } from '@/data/contratos'
import { blocoDaFichaJuridica } from '@/lib/juridico/ficha'
import { parseVigenciaMeses, montarPrazosDerivados } from '@/lib/juridico/prazosExtrair'
import { caparTexto, planejarPassadaLLM } from '@/lib/juridico/prazosTexto'
import type { PropostaPrazo, PrazoTipo } from '@/lib/juridico/prazosTipos'
import type { JuridicoPatch } from '@/lib/juridico/types'
import { generateBackgroundObject } from '../../cost/backgroundLLM'
import { EXTRACTION_MAX_OUTPUT } from '@/lib/llm-tuning'
import { promptExtrairPrazos } from './prompts'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'
interface GenUsage { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number }



const PrazosSchema = z.object({
  prazos: z.array(z.object({
    tipo: z.string(),
    titulo: z.string(),
    dataAlvo: z.string(),
    janelaDias: z.number(),
  })),
})

const TIPOS_VALIDOS = new Set<PrazoTipo>(['renovacao', 'aviso_previo', 'expiracao', 'pagamento', 'compromisso'])

export interface ExtrairPrazosInput { contratoId: string }
export interface ExtrairPrazosCtx { operatorId?: string; actingAgentId?: string }
export interface ExtrairPrazosDeps {
  generate?: (args: { prompt: string; schema: z.ZodType<unknown> }) => Promise<{ object: unknown; usage: GenUsage; model?: string }>
  getFicha?: typeof getFichaImpl
  getContrato?: typeof getContratoImpl
  recordCost?: typeof recordCostImpl
}
export interface ExtrairPrazosResult {
  output: string
  patch: JuridicoPatch | null
  
  truncado?: boolean
}


function avisoTruncamento(nota: string): string {
  return `⚠️ CONTRATO LONGO — ${nota} Confira MANUALMENTE os prazos no fim do documento (podem ter ficado de fora).`
}

async function defaultGenerate({ prompt, schema }: { prompt: string; schema: z.ZodType<unknown> }): Promise<{ object: unknown; usage: GenUsage; model: string }> {
  
  
  
  const { object, usage, model } = await generateBackgroundObject({ schema, prompt, maxOutputTokens: EXTRACTION_MAX_OUTPUT })
  return { object, usage, model }
}

function parse<T>(object: unknown, schema: z.ZodType<T>): T | null {
  const r = schema.safeParse(object)
  return r.success ? r.data : null
}


function extrairDataAssinatura(texto: string): string | null {
  const br = texto.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`
  const iso = texto.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  return null
}


function extrairAvisoDias(texto: string): number {
  const m = texto.match(/aviso pr[eé]vio de (\d{1,3})\s*dias/i)
  return m ? Number(m[1]) : 30
}

export async function extrairPrazos(
  input: ExtrairPrazosInput, ctx: ExtrairPrazosCtx, deps: ExtrairPrazosDeps = {},
): Promise<ExtrairPrazosResult> {
  if (!ctx.operatorId) return { output: 'Sem operador no contexto.', patch: null }
  const generate = deps.generate ?? defaultGenerate
  const getFicha = deps.getFicha ?? getFichaImpl
  const getContrato = deps.getContrato ?? getContratoImpl
  const recordCost = deps.recordCost ?? recordCostImpl
  const agentId = ctx.actingAgentId ?? 'juridico'
  const operatorId = ctx.operatorId

  const row = await getContrato(input.contratoId, operatorId)
  if (!row) return { output: 'Não achei esse contrato pra ler os prazos.', patch: null }

  
  const { texto, truncado, nota } = caparTexto(row.texto ?? '')
  const dataAssinatura = extrairDataAssinatura(texto)
  const vigenciaMeses = parseVigenciaMeses(texto)
  const avisoDias = extrairAvisoDias(texto)

  const derivados = montarPrazosDerivados({ dataAssinatura, vigenciaMeses, avisoDias })

  
  
  
  
  let llmPrazos: PropostaPrazo[] = []
  const { rodar, secoes } = planejarPassadaLLM(texto)
  if (rodar) {
    try {
      let ficha = ''
      try { ficha = blocoDaFichaJuridica(await getFicha(operatorId)) } catch (e) { console.warn('[extrairPrazos] ficha (fail-open):', e) }
      const prompt = promptExtrairPrazos({
        ficha,
        secoes,
        derivados: derivados.map((d) => `- ${d.tipo} · ${d.titulo} · ${d.dataAlvo}`),
      })
      const g = await generate({ prompt, schema: PrazosSchema })
      try {
        
        await recordCost({ kind: 'chat', model: g.model ?? MODEL, promptTokens: g.usage.inputTokens ?? 0, completionTokens: g.usage.outputTokens ?? 0, cachedTokens: g.usage.cachedInputTokens ?? 0, agent: agentId, tool: 'extrairPrazos' })
      } catch {  }
      const parsed = parse(g.object, PrazosSchema)
      if (parsed) {
        llmPrazos = parsed.prazos
          .filter((p) => TIPOS_VALIDOS.has(p.tipo as PrazoTipo))
          .map((p) => ({ tipo: p.tipo as PrazoTipo, titulo: p.titulo, dataAlvo: p.dataAlvo, janelaDias: p.janelaDias }))
      }
    } catch (e) {
      console.warn('[extrairPrazos] LLM (fail-open):', e)
    }
  }

  
  const merged: PropostaPrazo[] = []
  const seen = new Set<string>()
  for (const p of [...derivados, ...llmPrazos]) {
    const key = `${p.tipo}|${p.dataAlvo}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(p)
  }

  
  
  const alerta = truncado ? avisoTruncamento(nota) + '\n\n' : ''

  if (!merged.length) {
    return {
      output: alerta + 'Não consegui derivar os prazos desse contrato — quer cadastrar na mão?',
      patch: null,
      truncado,
    }
  }

  const patch: JuridicoPatch = { op: 'upsert', entidade: 'prazos-proposta', contratoId: input.contratoId, prazos: merged }
  const output = alerta + `Puxei ${merged.length} prazos pra você confirmar no palco.`
  return { output, patch, truncado }
}
