# syntax=docker/dockerfile:1

# ---- deps: instala dependências com o lockfile ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
# Cache mount do store do pnpm. Sem ele o build baixa os 544 pacotes toda vez que o
# lockfile muda (medido: `reused 0, downloaded 544`, 41s). O mount sobrevive a camada
# invalidada, entao so o que mudou de verdade e baixado.
RUN --mount=type=cache,target=/pnpm-store,sharing=locked \
  pnpm install --frozen-lockfile --store-dir /pnpm-store

# ---- build: compila o Next standalone ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# As NEXT_PUBLIC_* são INLINADAS no bundle em BUILD-time. Passá-las como --build-arg
# (no EasyPanel: variáveis de build) é OPCIONAL desde que o app passou a ler a conexão do
# ambiente em runtime e a entregá-la ao browser pelo documento (src/lib/env-supabase.ts).
# As chaves SERVER-side (SUPABASE_SERVICE_ROLE_KEY) NUNCA entram aqui, só em runtime.
#
# SEM linha `ENV` de propósito, e isso NÃO é descuido: um ARG declarado que ninguém passa
# fica AUSENTE do ambiente do RUN, mas `ENV X=$X` o materializa como string VAZIA. O bundle
# então nascia com `""` no lugar da URL, e todo fallback `?? SUPABASE_URL` ficava inalcançável
# (`'' ?? x` é `''`) — o middleware estourava em TODA rota num deploy com o painel preenchido.
# Um ARG que VEM preenchido chega sozinho ao RUN, então o inline segue valendo para quem o usa.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_BASE_URL
# Cache mount do cache do webpack. Este RUN vem depois de `COPY . .`, entao ele NUNCA pode
# ser acerto de camada: qualquer commit o invalida. O cache mount e a unica coisa que
# atravessa essa invalidacao, e e ele que faz a compilacao deixar de ser fria (medido: 114s
# de compilacao em todo deploy, com o cache serializado e jogado fora no fim).
# So o subdiretorio `cache` entra no mount: `.next/standalone` e `.next/static` continuam
# saindo normais para os COPY do runtime.
RUN --mount=type=cache,target=/app/.next/cache pnpm build

# ---- migrate-deps: a única dep do migrate.mjs (postgres, zero deps transitivas) ----
# npm de propósito: dá um diretório flat de verdade (sem symlinks do pnpm) e o standalone
# do Next não traça o migrate.mjs (não é importado pelo app) — copiamos a dep na mão.
FROM node:22-bookworm-slim AS migrate-deps
WORKDIR /deps
RUN npm init -y >/dev/null 2>&1 && npm install --no-audit --no-fund postgres@3

# ---- canvas-deps: o binário nativo do @napi-rs/canvas (OCR de PDF escaneado) ----
# O OCR de PDF ESCANEADO (`ocrScannedPdf` → unpdf.renderPageAsImage) carrega o
# @napi-rs/canvas, cujo `.node` (skia) vive num pacote-IRMÃO por-plataforma
# (@napi-rs/canvas-linux-x64-gnu). O file-tracing do `output:standalone` copia SÓ o
# loader JS (index.js/js-binding.js) — NUNCA o `.node` do irmão, porque ele é carregado
# por `require` dinâmico com try/catch (ponto cego do nft). Sem o binário, o
# `import('@napi-rs/canvas')` estoura em runtime e o OCR de escaneado quebra em silêncio
# (o app segue de pé; só a Fatia 4b falha). Instalamos via npm (layout FLAT, dirs reais —
# sem symlink do pnpm) na MESMA base linux e copiamos o irmão pro runtime. Mesmo padrão
# do `postgres` acima. PIN: manter em sincronia com a versão do @napi-rs/canvas no
# package.json (napi = loader e irmão devem casar).
FROM node:22-bookworm-slim AS canvas-deps
WORKDIR /canvas
RUN npm init -y >/dev/null 2>&1 && npm install --no-audit --no-fund @napi-rs/canvas@0.1.100

# ---- bancada-deps: sql.js (SQLite em WASM) do worker da bancada do Rui ----
# Mesmo padrão do `postgres`: o bancada-worker.mjs NÃO é importado pelo app, então o
# standalone não traça nem ele nem o sql.js; e o loader do sql.js resolve o `.wasm` por
# __dirname em runtime, que o nft também não enxerga. npm flat + COPY na mão.
# PIN: manter igual à versão do sql.js no package.json.
FROM node:22-bookworm-slim AS bancada-deps
WORKDIR /deps
RUN npm init -y >/dev/null 2>&1 && npm install --no-audit --no-fund sql.js@1.14.2

# ---- runtime: imagem mínima com git (o Segundo Cérebro usa simple-git) ----
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
# ca-certificates é OBRIGATÓRIO: o `git` (binário, spawned pelo simple-git) usa o CA do
# SISTEMA pra verificar o TLS do GitHub. O bookworm-slim NÃO traz os CA certs → `git clone`
# HTTPS falha com "server certificate verification failed. CAfile: none" (o Node usa o CA
# EMBUTIDO dele, então fetch/login funcionam — mas o auto-update e o sync do Cérebro, que
# são git, quebram). Sem esta linha, o clone do apply e do Cérebro NUNCA sobem.
# libcap2-bin traz o `setcap`: dá ao binário do node a capability de ligar em porta
# privilegiada (<1024) SEM virar root. Assim o container escuta na 80 (o padrão do
# EasyPanel — o domínio aponta pra 80 sem você trocar nada) e o app segue rodando
# como `node` (não-root). Sobrescreva com a env PORT se quiser outra porta.
# gosu: o entrypoint sobe como root SÓ pra consertar a dona do volume do Cérebro
# (o EasyPanel monta o volume root-owned; o app roda como `node`) e então LARGA o
# privilégio, re-executando o resto como `node`. Sem isso, o clone do Cérebro em
# /data/brain estoura EACCES ("permission denied") num volume montado.
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates libcap2-bin gosu \
  && rm -rf /var/lib/apt/lists/* \
  && setcap 'cap_net_bind_service=+ep' "$(readlink -f "$(command -v node)")"
ENV NODE_ENV=production \
    PORT=80 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1 \
    BRAIN_CLONE_DIR=/data/brain
# saída standalone do Next (server.js fica em /app/server.js)
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# skills/ (SKILL.md nativas do Mastra) — precisa ir pra imagem standalone (Next não traça dir de dados estático)
# SKILLS_DIR pode sobrescrever o caminho em runtime se necessário.
COPY --from=build /app/skills ./skills
# fonts/ (pacote tipográfico OFL do estúdio) — mesmo caso do skills/: é dir de DADO, o file-tracing
# do standalone não o enxerga. Sem ele, `registerFromPath` devolve null para todo arquivo e o
# compositor recusa compor (falha ALTA e explícita, não Arial silencioso).
COPY --from=build /app/fonts ./fonts
# runner de migrations: script + SQL + a única dep dele (fora do trace do standalone)
COPY --from=build /app/supabase/migrations ./supabase/migrations
# zona de customização do comprador: migrations custom (runtime) + fonte de verdade no container
COPY --from=build /app/custom ./custom
COPY --from=migrate-deps /deps/node_modules/postgres ./node_modules/postgres
# sql.js do bancada-worker.mjs (SQLite em WASM): fora do trace do standalone, ver stage bancada-deps.
COPY --from=bancada-deps /deps/node_modules/sql.js ./node_modules/sql.js
# binário nativo do @napi-rs/canvas (irmão por-plataforma com o skia.*.node) que o
# standalone NÃO traça — precisa ir AO LADO do loader JS já presente em @napi-rs/canvas.
# Sem ele, import('@napi-rs/canvas') falha e o OCR de PDF escaneado (Fatia 4b) quebra.
# Ver o stage canvas-deps acima. DUAS armadilhas ditam o formato abaixo:
#   1. o nome do irmão é ARCH-específico (canvas-linux-x64-gnu vs -arm64-gnu) — o npm só
#      instala o que casa com o host de build; hardcodar `-x64-` estoura "not found" num
#      build ARM64 (Oracle Ampere/Hetzner CAX/Graviton).
#   2. NÃO dá pra COPY a pasta @napi-rs inteira: o @napi-rs/canvas do standalone é um
#      SYMLINK do pnpm, e sobrepor um dir (o `canvas` loader do npm) num symlink faz o
#      docker estourar "cannot copy to non-directory".
# Solução: staging da pasta npm num path neutro + graft SÓ do irmão nativo (glob `canvas-*`
# casa `canvas-linux-<arch>-gnu`, NUNCA o loader `canvas`), preservando o nome arch-correto
# ao lado do loader já presente. Arch-agnóstico (x64 e arm64) e sem colisão.
COPY --from=canvas-deps /canvas/node_modules/@napi-rs/ /tmp/napi-rs/
RUN cp -R /tmp/napi-rs/canvas-* ./node_modules/@napi-rs/ && rm -rf /tmp/napi-rs
# Loops de fundo (o "cron" do self-host): entrypoint sobe o app + heartbeat (/api/heartbeat)
# + long-poll do Telegram (/api/telegram/poll) + migrate.mjs no boot + bancada-worker.mjs
# (spawnado sob demanda pela bancada do Rui). Vêm do CONTEXTO (raiz), não do stage de build.
# Os 5 arquivos são obrigatórios — o entrypoint referencia os 4 primeiros e o app spawna o 5º.
# Ver docs/DEPLOY.md §6.
COPY docker-entrypoint.sh heartbeat-tick.mjs telegram-poll.mjs migrate.mjs bancada-worker.mjs ./
# diretório de clone do cérebro. Semeia a dona certa (node) pro caso SEM volume — aí o
# clone vive na imagem e é re-clonado a cada redeploy (barato; o Git é a fonte da verdade).
# COM um volume explícito montado aqui (EasyPanel → Volumes → mount path /data/brain), o
# entrypoint re-chowna o mount no boot. NÃO declaramos `VOLUME` de propósito: a instrução
# criava um volume ANÔNIMO novo a cada redeploy (lixo de disco órfão na VPS) — persistência
# agora é opt-in via volume NOMEADO do EasyPanel. Ver docs/DEPLOY.md §4.
RUN mkdir -p /data/brain && chown node:node /data/brain
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=5 \
  CMD node -e "const p=process.env.PORT||80;require('http').get('http://127.0.0.1:'+p+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
# NÃO fixamos `USER node` aqui: o container sobe como root SÓ pra consertar a dona do volume
# do Cérebro (docker-entrypoint.sh) e IMEDIATAMENTE re-executa o resto como `node` via gosu.
# O app (server.js), o heartbeat e o migrate NUNCA rodam como root.
# entrypoint = app Next + heartbeat interno (loop). Invocado via `sh` (não precisa de bit +x
# — Windows não preserva permissão de execução). HEARTBEAT_ENABLED=0 volta ao só-app.
CMD ["sh", "/app/docker-entrypoint.sh"]
