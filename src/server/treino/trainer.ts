


import { z } from 'zod'
import { generateBackgroundObject } from '@/server/cost/backgroundLLM'
import { recordCost } from '@/data/cost'
import type { BgGenResult } from '@/server/cost/backgroundLLM'

export const GavetaItem = z.object({
  gaveta: z.enum(['base', 'diretriz', 'persona', 'playbook', 'regra']),
  conteudo: z.string(),
  
  
  campo: z.enum(['quem_e', 'tom', 'nunca_faz']).nullable(),
  titulo: z.string().nullable(),
})

export const Proposta = z.object({
  gavetas: z.array(GavetaItem).min(1),
  criterio: z.string(),
  explicacao: z.string(),
})

export type GavetaItem = z.infer<typeof GavetaItem>
export type Proposta = z.infer<typeof Proposta>

type RawGen = { object: unknown; usage: { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number }; model: string }

function PROMPT(input: {
  agentId: string
  sinal: string
  respostaDada: string | null
  mensagens: { role: string; content: string }[]
  fala: string
  baseResumo: string
  diretrizes: string[]
  personaResumo: string
}): string {
  const ultimasMensagens = input.mensagens.slice(-6)
  const mensagensTexto = ultimasMensagens
    .map((m) => `${m.role === 'user' ? 'Cliente' : 'Atendente'}: ${m.content}`)
    .join('\n')

  const diretrizesTexto =
    input.diretrizes.length > 0
      ? input.diretrizes.map((d, i) => `${i + 1}. ${d}`).join('\n')
      : '(nenhuma diretriz cadastrada)'

  return `Você é o Treinador do atendente (agente: ${input.agentId}).
O operador revisou uma conversa e quer ensinar algo novo ao atendente.

## CONVERSA (últimas mensagens)
${mensagensTexto || '(sem mensagens)'}

## RESPOSTA DADA PELO ATENDENTE
${input.respostaDada ?? '(sem resposta registrada)'}

## SINAL / PROBLEMA IDENTIFICADO
${input.sinal}

## O QUE O OPERADOR QUER ENSINAR
${input.fala}

## ESTADO ATUAL DO ATENDENTE

### Base de Conhecimento (resumo)
${input.baseResumo || '(base vazia)'}

### Diretrizes já registradas
${diretrizesTexto}

### Persona atual
${input.personaResumo || '(sem persona configurada)'}

## SUA TAREFA
Analise o que o operador quer ensinar e decida em quais "gavetas" guardar:

- **base**: fato pontual (preço, horário, política) — qualquer CONTEÚDO fixo que o atendente precisa saber. Deve ter um "titulo" curto e descritivo. Exemplo: "Horário de atendimento é das 9h às 18h".
- **playbook**: "quando X → responda/faça Y" (comportamento situacional). **É AQUI que vai a MAIORIA dos ajustes de jeito** — é o DEFAULT do "jeito". Deve ter um "titulo" curto descrevendo a situação. Exemplo: titulo="Reclamação de atraso", conteudo="Quando o cliente reclama de atraso, peça desculpa e ofereça previsão nova.". Use sempre que o ensinamento for uma reação a uma situação específica.
- **persona**: papel/identidade do atendente — use "campo" = "quem_e" (quem ela é), "tom" (estilo de voz geral) ou "nunca_faz" (comportamentos proibidos). Exemplo: campo="tom", conteudo="Caloroso e empático".
- **regra**: REGRA DE OURO — universal e INVIOLÁVEL, vale em TODA conversa (ex.: "nunca prometa reembolso sem aprovação"). São NO MÁXIMO 7 no total, então use com MUITA parcimônia. Se o ensinamento for situacional ("quando X → Y"), use **playbook**, NUNCA regra.

**REGRAS:**
1. Você PODE combinar múltiplas gavetas numa mesma proposta se o ensinamento cobrir mais de uma dimensão.
2. "criterio" deve ser uma frase VERIFICÁVEL e OBJETIVA — algo que se possa testar: "A resposta deve mencionar o horário das 9h às 18h". Evite critérios vagos.
3. "explicacao" deve ser em linguagem LEIGA e amigável, começando com "Vou guardar..." — explique o que vai ser salvo e onde, sem jargões técnicos. Exemplo: "Vou guardar na base que o atendimento funciona das 9h às 18h, e vou instruir a Sofia a sempre confirmar o horário quando perguntada."
4. Não duplique conteúdo que já existe nas diretrizes ou na persona (verifique o estado atual acima).
5. Prefira conteúdo ESPECÍFICO e CONCRETO ao invés de genérico.

Retorne o objeto JSON com gavetas[], criterio e explicacao.`
}

export async function proporCorrecao(
  input: {
    agentId: string
    sinal: string
    respostaDada: string | null
    mensagens: { role: string; content: string }[]
    fala: string
    baseResumo: string
    diretrizes: string[]
    personaResumo: string
  },
  deps: { generate?: (p: string) => Promise<RawGen> } = {},
): Promise<Proposta> {
  const generate =
    deps.generate ??
    ((p: string) => generateBackgroundObject({ schema: Proposta, prompt: p }) as Promise<RawGen>)
  const raw = await generate(PROMPT(input))
  await recordCost({
    kind: 'chat',
    model: raw.model,
    promptTokens: raw.usage.inputTokens ?? 0,
    completionTokens: raw.usage.outputTokens ?? 0,
    cachedTokens: raw.usage.cachedInputTokens ?? 0,
    agent: input.agentId,
    tool: 'treinoTreinador',
  })
  return Proposta.parse(raw.object)
}
