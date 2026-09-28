#!/bin/sh
# docker-entrypoint.sh — sobe o app Next standalone + o HEARTBEAT interno (o "cron" do
# self-host, embutido no container conforme o guia de cron do EasyPanel). Assim a máquina
# do comprador processa sozinha a fila de memória (Ficha da conta/reflexões/rollup), o
# maestro, a licença e o catálogo — sem precisar de um agendador externo.
#
# O heartbeat roda como um LOOP em background (mais simples que um daemon de cron numa
# imagem Debian não-root: "menos peças móveis"). É SERIAL (cada batida termina antes do
# sleep → sem sobreposição) e FAIL-OPEN (nunca derruba o app). Desligue com
# HEARTBEAT_ENABLED=0. Ajuste o intervalo com HEARTBEAT_INTERVAL_SECONDS (default 300).
set -e

# ── Conserto de dona do volume do Cérebro (self-host, "sem programar") ──
# O EasyPanel monta o volume persistente ROOT-OWNED, mas o app roda como `node` (uid 1000) →
# o clone do Cérebro em /data/brain estourava EACCES ("permission denied"). Então subimos como
# root SÓ pra chown o dir do clone (+ o espelho de skills VIVAS, que fica ao lado), e LARGAMOS
# o privilégio na hora: re-executamos ESTE script como `node` via gosu. Tudo abaixo roda como
# `node`. Idempotente e à prova de "sem volume" (aí só reafirma a dona do dir da imagem).
if [ "$(id -u)" = "0" ]; then
  BRAIN_DIR="${BRAIN_CLONE_DIR:-/data/brain}"
  mkdir -p "$BRAIN_DIR" "${BRAIN_DIR}-skills-live" 2>/dev/null || true
  chown -R node:node "$BRAIN_DIR" "${BRAIN_DIR}-skills-live" 2>/dev/null || true
  exec gosu node sh "$0" "$@"
fi

# migrations pendentes ANTES do server: falha => container não sobe => o deploy
# zero-downtime do EasyPanel mantém a versão antiga servindo (sem SUPABASE_DB_URL é no-op)
node /app/migrate.mjs

# O `:-` só cobre ausente ou vazio. Um `0` faz o laço bater na rota sem parar; um `abc` faz o
# `sleep` errar a cada volta e o laço rodar sem espera nenhuma; e um número absurdo faz o
# aviso de "trabalho automático parado" nunca mais disparar no painel. A tela promete ao
# comprador um ritmo lido em TypeScript (`intervaloDoHeartbeatS`), e as duas leituras têm de
# dar o MESMO número para toda entrada. Só inteiro de 1 a 86400 passa.
# ==> INTERVALO DO HEARTBEAT: INICIO DO TRECHO CONFERIDO POR TESTE
INTERVALO_HEARTBEAT="${HEARTBEAT_INTERVAL_SECONDS:-300}"
case "$INTERVALO_HEARTBEAT" in
  ''|*[!0-9]*) INTERVALO_HEARTBEAT=300 ;;
esac
[ "$INTERVALO_HEARTBEAT" -gt 0 ] 2>/dev/null || INTERVALO_HEARTBEAT=300
[ "$INTERVALO_HEARTBEAT" -le 86400 ] 2>/dev/null || INTERVALO_HEARTBEAT=300
# <== INTERVALO DO HEARTBEAT: FIM DO TRECHO CONFERIDO POR TESTE

if [ "${HEARTBEAT_ENABLED:-1}" = "1" ]; then
  (
    sleep "${HEARTBEAT_BOOT_DELAY:-20}"          # deixa o server subir antes da 1ª batida
    while true; do
      node /app/heartbeat-tick.mjs || true
      sleep "$INTERVALO_HEARTBEAT"
    done
  ) &
fi

if [ "${TELEGRAM_ENABLED:-1}" = "1" ]; then
  (
    sleep "${HEARTBEAT_BOOT_DELAY:-20}"
    while true; do
      node /app/telegram-poll.mjs || true
      sleep 5
    done
  ) &
fi

# o app é o processo principal (recebe sinais / define o ciclo de vida do container)
exec node server.js
