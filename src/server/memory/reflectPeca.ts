



import { licaoDaPeca } from '@/lib/estudio/adPerf'
import { z, ZodError } from 'zod'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { getSecret, SECRET_KEYS } from '../secrets'
import { NotConfiguredError } from '../brain/runtime'
import { recordCost as recordCostImpl } from '@/data/cost'
import { getPecaComVersoes as getPecaImpl, marcarPecaAprendida as marcarImpl } from '@/data/pecas'
import { getDefaultBrand as getBrandImpl } from '@/data/brands'
import { getBrandVoice as getVoiceImpl, upsertBrandVoice as upsertVoiceImpl } from '@/data/brandVoice'
import { mergeBrandVoice, type BrandVoicePatch } from '@/lib/estudio/brandVoice'
import { blocoDeAprendizadosDaMarca } from './reflectBrand'
import { espelharVozNoCerebro as espelharImpl } from '../tools/estudio/espelhoCerebro'
import type { AdPerf } from '@/lib/estudio/adPerf'
import type { Variacao } from '@/lib/estudio/types'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'

export const PecaPerfPatchSchema = z.object({
  aprendizados: z.array(z.string()),
})

interface GenResult { object: unknown; usage: { inputTokens?: number; outputTokens?: number } }


const ONDE_FALHOU: Partial<Record<NonNullable<AdPerf['causa']>, string>> = {
  hook: 'ATENÇÃO: o funil quebrou no HOOK — quase ninguém passou dos primeiros segundos, então a copy praticamente não foi lida. Só devolva algo se a lição for sobre a ABERTURA; para o resto do texto, devolva [].',
  hold: 'ATENÇÃO: o funil quebrou no HOLD — as pessoas começaram e abandonaram no meio. A lição, se houver, é sobre RITMO e sobre a promessa da abertura não se sustentar; não é sobre a oferta nem sobre o CTA.',
  ctr_cta: 'O funil quebrou no clique: as pessoas viram e não clicaram. É aqui que a copy responde — chamada, oferta e CTA.',
  downstream: 'O criativo fez o trabalho dele (atenção e clique vieram); o problema está DEPOIS do clique. Provavelmente não é lição de copy do anúncio: devolva [] se o sinal não for do texto.',
  cedo: 'ATENÇÃO: o gasto ainda é baixo demais para julgar. Devolva [] a menos que o padrão seja gritante.',
}

function buildPrompt(licao: 'repetir' | 'evitar', varSel: Variacao, perf: AdPerf, aprendAtuais: string): string {
  const met = [
    perf.roas !== undefined ? `ROAS ${perf.roas.toFixed(2)}` : null,
    perf.ctr !== undefined ? `CTR ${perf.ctr.toFixed(4)}` : null,
    perf.hookRate !== undefined ? `hook ${(perf.hookRate * 100).toFixed(0)}%` : null,
    perf.holdRate !== undefined ? `hold ${(perf.holdRate * 100).toFixed(0)}%` : null,
  ].filter(Boolean).join(', ')
  
  
  
  const ondeFalhou = ONDE_FALHOU[perf.causa ?? 'saudavel']
  
  
  const perdeu = licao === 'evitar'
  const abertura = perdeu
    ? `A copy abaixo virou um anúncio que ficou ABAIXO do normal da conta (${met || 'abaixo do normal'}). Destile o que provavelmente EXPLICA o fracasso e vire isso em PROIBIÇÃO durável pro DNA da marca. Frases curtas e acionáveis começando com "EVITE:", ex.: "EVITE: abrir com pergunta genérica".`
    : `A copy abaixo virou um anúncio que bateu ACIMA do normal da conta (${met || 'acima do normal'}). Destile a FÓRMULA desta copy que provavelmente explica o desempenho — gancho/abertura, ângulo, ordem dos argumentos, prova/autoridade, oferta, CTA, tom — como aprendizado DURÁVEL pro DNA da marca. Frases curtas e acionáveis, ex.: "CONVERTE: abre com contraste/indignação".`
  return `Você é o copywriter estrategista. ${abertura}${ondeFalhou ? ` ${ondeFalhou}` : ''} NÃO repita o que já está nos aprendizados atuais; NÃO invente (não force padrão onde não há sinal claro). Um anúncio ruim pode ter ido mal por público ou verba, não por texto: se o sinal não for do TEXTO, devolva []. Use [] se não houver nada realmente novo.

APRENDIZADOS ATUAIS DA MARCA:
${aprendAtuais || '(nenhum ainda)'}

${perdeu ? 'COPY QUE PERDEU' : 'COPY VENCEDORA'} (ângulo "${varSel.angulo}"):
"${varSel.texto}"

Devolva JSON: aprendizados (array [] de frases curtas de padrão durável de copy).`
}

async function defaultGenerate({ prompt }: { prompt: string }): Promise<GenResult> {
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) throw new NotConfiguredError(['openai_api_key'])
  const openai = createOpenAI({ apiKey })
  const { object, usage } = await generateObject({ model: openai(MODEL), schema: PecaPerfPatchSchema, prompt })
  return { object, usage }
}

export interface ReflectPecaDeps {
  getPecaComVersoes?: typeof getPecaImpl
  getDefaultBrand?: typeof getBrandImpl
  getBrandVoice?: typeof getVoiceImpl
  upsertBrandVoice?: typeof upsertVoiceImpl
  marcarPecaAprendida?: typeof marcarImpl
  espelhar?: typeof espelharImpl
  generate?: (args: { prompt: string }) => Promise<GenResult>
  recordCost?: typeof recordCostImpl
  now?: () => string
}

export async function reflectPeca(ref: string, deps: ReflectPecaDeps = {}): Promise<{ reflected: boolean; error?: boolean; permanent?: boolean }> {
  try {
    const sep = ref.indexOf(':')
    if (sep < 0) return { reflected: false }
    const operatorId = ref.slice(0, sep), pecaId = ref.slice(sep + 1)
    if (!operatorId || !pecaId) return { reflected: false }

    const getPeca = deps.getPecaComVersoes ?? getPecaImpl
    const getBrand = deps.getDefaultBrand ?? getBrandImpl
    const getVoice = deps.getBrandVoice ?? getVoiceImpl
    const upsert = deps.upsertBrandVoice ?? upsertVoiceImpl
    const marcar = deps.marcarPecaAprendida ?? marcarImpl
    const espelhar = deps.espelhar ?? espelharImpl
    const generate = deps.generate ?? defaultGenerate
    const recordCost = deps.recordCost ?? recordCostImpl
    const now = deps.now ?? (() => new Date().toISOString())

    const peca = await getPeca(pecaId)
    if (!peca || peca.operator_id !== operatorId) return { reflected: false }
    const perf = peca.ad_perf
    
    
    const licao = licaoDaPeca(perf)
    if (!peca.ad_id || !perf || !licao) return { reflected: false }
    if (peca.aprendido_ad_id === peca.ad_id) return { reflected: false }

    const brand = await getBrand(operatorId)
    if (!brand) return { reflected: false }
    const voice = await getVoice(operatorId, brand.id)

    const v = peca.versoes[peca.versoes.length - 1]
    if (!v) return { reflected: false }
    const escolhida = v.veredito.escolhida ?? 0
    const varSel = v.variacoes[escolhida] ?? v.variacoes[0]
    if (!varSel) return { reflected: false }

    
    
    
    const raw = await generate({ prompt: buildPrompt(licao, varSel, perf, blocoDeAprendizadosDaMarca(voice)) })
    try { await recordCost({ kind: 'chat', model: MODEL, promptTokens: raw.usage.inputTokens ?? 0, completionTokens: raw.usage.outputTokens ?? 0, agent: 'copywriter', tool: 'reflectPeca' }) } catch {  }

    const parsed = PecaPerfPatchSchema.parse(raw.object)
    const patch: BrandVoicePatch = { aprendizados: parsed.aprendizados.map((t) => ({ texto: t, escopo: 'diretriz', canal: null })) }
    const next = mergeBrandVoice(voice, patch, { origem: 'reflector', at: now() })
    await upsert(operatorId, brand.id, next)
    try { await espelhar({ slug: brand.slug, nomeMarca: brand.nome, voice: next }) } catch {  }
    await marcar(pecaId, operatorId, peca.ad_id)
    return { reflected: parsed.aprendizados.length > 0 }
  } catch (e) {
    console.warn('[reflectPeca] fail-open:', e)
    return { reflected: false, error: true, permanent: e instanceof ZodError }
  }
}
