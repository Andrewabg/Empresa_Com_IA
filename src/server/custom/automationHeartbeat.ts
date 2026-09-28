// src/server/custom/automationHeartbeat.ts — o braço do heartbeat que processa a
// automação da zona custom/: fila de webhooks (claim → processar → done/retry/dead),
// cold-requeue de claims órfãos, rotinas periódicas por cadência e purga de terminais.
// TUDO fail-open POR ITEM: um webhook/rotina ruim NUNCA derruba o braço nem o heartbeat.
import { withTimeout } from '@/lib/withTimeout'
import { getSetting, setSetting } from '@/data/settings'
import {
  claimLote,
  marcarDone,
  marcarRetry,
  requeueProcessingOrfaos,
  purgarVelhos,
} from '@/data/webhookEvents'
import { getCustomWebhooks } from './registryWebhooks'
import { getCustomRotinas } from './registryRotinas'
import { construirCtxCustom } from './contextoCustom'
import { proximaTentativa } from './backoff'
import type { WebhookEvent } from './contrato'

/** Quantos eventos vencidos processar por tick. */
const LOTE = 20
/** Timeout por handler (webhook/rotina) — converte HANG em erro rápido. */
const TIMEOUT_MS = 25_000
/** Janela de staleness do cold-requeue: claim 'processing' mais velho que isto é órfão. */
const STALENESS_MS = 5 * 60_000
/** Retenção de terminais (done/dead/rejected). */
const RETENCAO_MS = 30 * 24 * 60 * 60_000

export interface CustomAutomationResult {
  processados: number
  falhas: number
  rotinasRodadas: number
  revividos: number
  purgados: number
}

export async function runCustomAutomationHeartbeat(): Promise<CustomAutomationResult> {
  let processados = 0
  let falhas = 0
  let rotinasRodadas = 0
  let revividos = 0
  let purgados = 0

  // ctx base — reusado por webhooks e rotinas (ids nulos: não há turno/conversa aqui).
  const ctx = construirCtxCustom({ agentId: null, operatorId: null, conversationId: null })

  // (0) Cold-requeue de órfã PRIMEIRO. Cutoff PASSADO (now - 5min), NUNCA `now`, senão
  //     pegaria claims recém-vivos (ainda em processamento neste mesmo tick de outro nó).
  try {
    revividos = await requeueProcessingOrfaos(new Date(Date.now() - STALENESS_MS).toISOString())
  } catch (e) {
    console.warn('[custom-automation] cold-requeue fail-open:', e)
  }

  // (1) Fila de webhooks: claim atômico do lote, processa cada um com try/catch POR EVENTO.
  try {
    const lote = await claimLote(LOTE)
    const webhooks = getCustomWebhooks()
    for (const row of lote) {
      const webhook = webhooks.find((w) => w.slug === row.slug)
      // Slug removido do registro do cliente → dead direto (não fica em loop de retry).
      if (!webhook) {
        try {
          await marcarRetry(row.id, {
            attempts: row.attempts + 1,
            dead: true,
            nextAttemptAt: null,
            erro: 'webhook não registrado',
          })
        } catch (e) {
          console.warn('[custom-automation] marcarRetry (não registrado) fail-open:', e)
        }
        falhas++
        continue
      }

      // O `raw` é RECONSTRUÍDO do payload — a assinatura já foi verificada no ingress
      // (/api/hooks/<slug>); aqui o raw é só conveniência pro `processar`.
      const evento: WebhookEvent = {
        slug: row.slug,
        body: row.payload,
        headers: (row.headers ?? {}) as Record<string, string>,
        raw: typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload ?? {}),
      }

      try {
        await withTimeout(webhook.processar(evento, ctx), TIMEOUT_MS, 'custom.processar:' + row.slug)
        await marcarDone(row.id)
        processados++
      } catch (err) {
        // Off-by-one: row.attempts = falhas anteriores; a que acabou de falhar é +1.
        const bo = proximaTentativa(row.attempts + 1, new Date())
        try {
          await marcarRetry(row.id, {
            attempts: row.attempts + 1,
            dead: bo.dead,
            nextAttemptAt: bo.nextAttemptAt,
            erro: String(err),
          })
        } catch (e) {
          console.warn('[custom-automation] marcarRetry fail-open:', e)
        }
        falhas++
      }
    }
  } catch (e) {
    console.warn('[custom-automation] fila fail-open:', e)
  }

  // (2) Rotinas periódicas: roda quem venceu a cadência (sem setting = nunca rodou).
  // Single-node (Motor = 1 container/1 heartbeat): read-check-write simples do setting,
  // sem claim atômico — em multi-node dois ticks concorrentes poderiam duplicar a rotina.
  try {
    const agora = Date.now()
    for (const rotina of getCustomRotinas()) {
      const chave = 'custom_rotina_' + rotina.id + '_ultima'
      let venceu = true
      try {
        const ultimaIso = await getSetting(chave)
        if (ultimaIso) {
          const decorridoMin = (agora - new Date(ultimaIso).getTime()) / 60_000
          venceu = decorridoMin >= rotina.cadaMinutos
        }
      } catch (e) {
        // Falha ao ler o setting não deve travar a rotina — assume venceu (fail-open).
        console.warn('[custom-automation] leitura de cadência fail-open:', e)
      }
      if (!venceu) continue
      try {
        await withTimeout(rotina.executar(ctx), TIMEOUT_MS, 'custom.rotina:' + rotina.id)
        await setSetting(chave, new Date().toISOString())
        rotinasRodadas++
      } catch (e) {
        // Rotina ruim NÃO derruba o braço; não atualiza o carimbo (tenta de novo no próximo tick).
        console.warn('[custom-automation] rotina fail-open:', e)
      }
    }
  } catch (e) {
    console.warn('[custom-automation] rotinas fail-open:', e)
  }

  // (3) Purga de terminais velhos (retenção). purgarVelhos devolve a contagem apagada
  //     (via .select('id'), como requeueProcessingOrfaos); fail-open mantém purgados=0.
  try {
    purgados = await purgarVelhos(new Date(Date.now() - RETENCAO_MS).toISOString())
  } catch (e) {
    console.warn('[custom-automation] purga fail-open:', e)
  }

  return { processados, falhas, rotinasRodadas, revividos, purgados }
}
