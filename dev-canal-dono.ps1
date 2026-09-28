# dev-canal-dono.ps1 — sobe os 2 loops que o container roda sozinho em produção,
# para o `next dev` (que NÃO tem cron): long-polling do Telegram + heartbeat.
# Uso: duplo-clique ou `powershell -File dev-canal-dono.ps1` (pare com Ctrl+C).
# Sem segredos aqui: lê o .env e reusa telegram-poll.mjs / heartbeat-tick.mjs (raiz).
$ErrorActionPreference = 'SilentlyContinue'
Set-Location $PSScriptRoot

# Carrega as vars do .env no processo (só as que os .mjs usam)
Get-Content .env | Where-Object { $_ -match '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|PORT)=' } | ForEach-Object {
  $k, $v = $_ -split '=', 2
  [Environment]::SetEnvironmentVariable($k.Trim(), $v.Trim(), 'Process')
}

Write-Host "[dev-canal-dono] subindo telegram-poll.mjs (long-poll) + heartbeat a cada 120s. Ctrl+C para parar."

# Telegram: processo LONGO (loop interno próprio) — roda como job e ressuscita se morrer
$tg = Start-Job -ScriptBlock {
  Set-Location $using:PSScriptRoot
  while ($true) { node telegram-poll.mjs; Start-Sleep -Seconds 5 }
}

# Heartbeat: tick single-shot em loop (espelha o docker-entrypoint.sh)
try {
  while ($true) {
    node heartbeat-tick.mjs | Out-Null
    Start-Sleep -Seconds 120
  }
} finally {
  Stop-Job $tg; Remove-Job $tg -Force
  Write-Host "[dev-canal-dono] loops encerrados."
}
