

















import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import {
  derivarFicha,
  fichaCompleta,
  resolverCpaTeto,
  type Ficha,
  type RespostasBrutas,
} from '@/lib/google-ads/ficha'
import { coberturaFicha, proximaPergunta } from '@/lib/google-ads/entrevista'
import {
  getFichaGoogle as getFichaGoogleDefault,
  salvarFichaGoogle as salvarFichaGoogleDefault,
} from '@/server/google-ads/ficha-store'
import { getTurnContext } from '@/server/agent/turnContext'





export interface EntrevistaFichaCtx {
  
  operatorId?: string
}

export interface EntrevistaFichaDeps {
  
  getFichaGoogle: (operatorId: string, accountId: string) => Promise<Ficha | null>
  
  salvarFichaGoogle: (operatorId: string, accountId: string, ficha: Ficha) => Promise<void>
  
  resolveAccountId: (operatorId: string) => Promise<string | null>
}

export type EntrevistaFichaResult =
  | {
      ok: true
      ficha: Ficha
      
      proximaPergunta: string | null
      
      completa: boolean
    }
  | {
      ok: false
      message: string
      ficha?: never
      proximaPergunta: null
      completa?: never
    }






async function resolveAccountIdDefault(operatorId: string): Promise<string | null> {
  
  const { lerCredenciais } = await import('@/server/google-ads/client')
  const creds = await lerCredenciais()
  if (!creds?.customerId) return null
  return creds.customerId
}

const defaultDeps: EntrevistaFichaDeps = {
  getFichaGoogle: getFichaGoogleDefault,
  salvarFichaGoogle: salvarFichaGoogleDefault,
  resolveAccountId: resolveAccountIdDefault,
}






function mesclarFicha(existente: Ficha, novas: Ficha): Ficha {
  
  const mesclada: Ficha = { ...existente }
  for (const chave of Object.keys(novas) as (keyof Ficha)[]) {
    const valor = novas[chave]
    if (valor !== undefined) {
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(mesclada as any)[chave] = valor
    }
  }
  return mesclada
}






export async function registrarRespostasFicha(
  input: RespostasBrutas,
  ctx: EntrevistaFichaCtx,
  deps: EntrevistaFichaDeps = defaultDeps,
): Promise<EntrevistaFichaResult> {
  
  if (!ctx.operatorId) {
    return { ok: false, message: 'Sem operador no contexto.', proximaPergunta: null }
  }

  const accountId = await deps.resolveAccountId(ctx.operatorId)
  if (!accountId) {
    return {
      ok: false,
      message: 'Não encontrei a conta do Google Ads configurada. Configure as credenciais primeiro.',
      proximaPergunta: null,
    }
  }

  
  const fichaExistente: Ficha = (await deps.getFichaGoogle(ctx.operatorId, accountId)) ?? {}

  
  
  
  const fichaNovaTurno = derivarFicha(input)

  
  const fichaMesclada = mesclarFicha(fichaExistente, fichaNovaTurno)

  
  
  
  
  
  
  
  if (fichaMesclada.ticket != null && fichaMesclada.margem != null) {
    const cpaResult = resolverCpaTeto({
      ticket: fichaMesclada.ticket,
      margem: fichaMesclada.margem,
      ltv: fichaMesclada.ltv ?? 1,
      maxPorClienteDesejado: fichaMesclada.maxPorClienteDesejado ?? undefined,
    })
    fichaMesclada.cpaTetoBreakeven = cpaResult.breakeven
    fichaMesclada.cpaTetoRealista = cpaResult.alvoRealista
  }

  
  await deps.salvarFichaGoogle(ctx.operatorId, accountId, fichaMesclada)

  
  const cobertura = coberturaFicha(fichaMesclada)
  const completa = fichaCompleta(fichaMesclada)
  const proxima = proximaPergunta(fichaMesclada)

  return {
    ok: true,
    ficha: fichaMesclada,
    proximaPergunta: proxima,
    completa,
  }
}






const schemaRespostas = z.object({
  ticket: z
    .string()
    .optional()
    .describe('Ticket médio do produto/serviço em reais (ex.: "R$ 800", "1200").'),
  margem: z
    .string()
    .optional()
    .describe('Margem bruta em % ou fração (ex.: "40%", "0,4").'),
  ltv: z
    .string()
    .optional()
    .describe('Fator LTV: quantas compras o cliente faz (ex.: "1", "3"). Default é 1.'),
  maxPorCliente: z
    .string()
    .optional()
    .describe('Quanto o dono quer pagar por cliente em reais (ex.: "R$ 80").'),
  oQueFaz: z
    .string()
    .optional()
    .describe('O que a empresa faz em 1-2 frases.'),
  vertical: z
    .string()
    .optional()
    .describe('Segmento/vertical do negócio (ex.: saúde, advocacia, e-commerce).'),
  publicoAlvo: z
    .string()
    .optional()
    .describe('Público-alvo / cliente ideal.'),
  geografia: z
    .string()
    .optional()
    .describe('Regiões/cidades de atuação.'),
  capacidade: z
    .string()
    .optional()
    .describe('Capacidade de atendimento em clientes/mês (ex.: "20 consultas").'),
  sazonalidade: z
    .string()
    .optional()
    .describe('Padrão de sazonalidade do negócio.'),
  objetivo: z
    .string()
    .optional()
    .describe('Objetivo principal da campanha de Google Ads.'),
})


export const entrevistaFichaTool = createTool({
  id: 'entrevistaFicha',
  description:
    
    
    
    'Registra as respostas do dono sobre o negócio na Ficha do Google Ads e retorna a próxima pergunta da entrevista. Use após cada resposta do dono. Pode passar um ou vários campos na mesma chamada — o histórico acumula entre turnos. Quando `completa:true`, a Ficha está pronta para o Gael começar a analisar a conta.',
  inputSchema: schemaRespostas,
  execute: async (input) => {
    const ctx = getTurnContext()
    return registrarRespostasFicha(input, { operatorId: ctx.operatorId })
  },
})
