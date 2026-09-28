# Deploy do Awave Agents (self-host · EasyPanel / Docker)

O Awave roda como **1 container** a partir do `Dockerfile` na raiz. Você traz um **Supabase**
(cloud ou self-host) e pluga as chaves de IA no próprio app (`/config` → Supabase Vault). Não há
segredos na imagem.

> **Infra recomendada:** uma VPS com **≥ 2 vCPU / 4 GB de RAM**. O EasyPanel **builda a imagem a
> partir do source**, e o build do Next é o momento de maior consumo — com pouca memória o build
> pode falhar (OOM). Depois de no ar, o app é leve (1 container Node).

---

## 0. Recebi um `.zip` — comece aqui

Se você baixou sua cópia como **`.zip`** (e não clonou um repo), faça esta ponte **uma vez** —
do `.zip` em diante o fluxo é idêntico ao do guia.

1. Na **área de membros**, clique em **"Baixar minha cópia"** para baixar o `.zip`.
2. **Descompacte.** Na raiz do conteúdo já estão o `Dockerfile`, o `supabase/migrations`, o `src/`
   etc. (o diretório-raiz do tarball foi removido — não há pasta extra envolvendo tudo).
3. Crie um **repo PRIVADO seu** (GitHub ou GitLab) e dê **push** do conteúdo descompactado pra ele:
   ```bash
   git init
   git add .
   git commit -m "Awave Agents — minha cópia"
   git remote add origin <seu-repo-privado>
   git push -u origin main
   ```
4. No EasyPanel, **aponte o app pra ESSE repo**. Daí em diante é **idêntico** ao passo de §3
   ("source = este repositório" — agora "este repositório" = o seu repo privado).
5. Siga o resto do guia normalmente: Supabase + migrations (§1), env + build-args `NEXT_PUBLIC_*`
   (§2), primeiro boot (§5).

> O `.zip` **não contém segredos** — o `.env` fica de fora e as chaves vão no `/config` → Vault
> (igual a qualquer deploy). Ele traz um **carimbo** em `src/server/awave-stamp.json` com a sua
> identidade (rastreabilidade — a UI mostra um rodapé discreto "Licenciado para você").

## 1. Pré-requisitos

- Um projeto **Supabase** (cloud em supabase.com, ou self-host seu).
- **TODAS as migrations aplicadas no Supabase de produção**, em ordem crescente:
  `supabase/migrations/0001_…` até a **última** que existir na sua cópia (hoje: `0046`).
  O número cresce a cada release — a regra é sempre a mesma: **todas, em ordem**.

  > 💡 **Instalação NOVA + `SUPABASE_DB_URL` configurada (§2.1) = este passo é automático.**
  > No primeiro boot o container detecta o banco virgem e aplica todas as migrations sozinho,
  > antes do server subir. As vias manuais abaixo continuam valendo pra quem preferir (ou não
  > quiser configurar a env).

  **Como aplicar (escolha UMA das vias):**
  - **Supabase CLI (recomendado):** na pasta da sua cópia,
    ```bash
    supabase link --project-ref <ref-do-seu-projeto>
    supabase db push
    ```
    O CLI aplica as pendentes em ordem e registra o que já foi aplicado (atualizar depois = rodar
    `supabase db push` de novo).
  - **SQL Editor do Supabase (sem instalar nada):** abra cada arquivo de `supabase/migrations/`
    **em ordem crescente** e execute o conteúdo no SQL Editor. Tedioso, porém infalível.

  > ⚠️ **Nunca reaplique uma migration antiga por cima de uma mais nova.** Exemplo real: `0008` e
  > `0010` recriam o MESMO constraint `cost_events_kind_check` — na ordem crescente é seguro, mas
  > reaplicar a `0008` DEPOIS da `0010` remove o valor `'action'` e o custo das ações externas
  > para de gravar silenciosamente.
- Uma **OpenAI API key**, um **repo GitHub** (pode ser vazio — vira o Segundo Cérebro) + **GitHub
  token** (`contents:write` + `pull-requests:write`), e — opcionais — uma **Composio API key**
  (ações externas), um **bot do Telegram** (canal do dono) e as credenciais do **WhatsApp Cloud
  API** (inbox de atendimento). Tudo isso você cola no `/config` depois (**nada vai no env**).

  > 💡 **O mesmo token do GitHub precisa de acesso de escrita em DOIS repos:** o do **Cérebro**
  > (onde ele comita/abre PR de conhecimento) **e** o do **Motor** (o repo privado do §0) — o
  > **update 1-clique (§7.1)** faz push da versão nova nesse repo. Se o token for de uma conta sem
  > acesso ao repo do Motor, o update sobe o `.zip` mas falha no push.

## 2. Variáveis de ambiente

### 2.1 Runtime (env do app no EasyPanel)
| Variável | Obrigatória | O quê |
|---|---|---|
| `SUPABASE_URL` | ✅ | URL do Supabase (server-side). |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service-role key — **segredo**, nunca exposto ao browser. |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Mesma URL (cliente do browser). Veja 2.2 ⚠️. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Anon key (segura de expor). Veja 2.2 ⚠️. |
| `NEXT_PUBLIC_BASE_URL` | — | Domínio público (ex.: `https://seu-dominio.com`). **Opcional:** sem ela o app lê o domínio dos cabeçalhos `x-forwarded-*` que o proxy do EasyPanel já manda, e os links externos (callback de OAuth, webhook do WhatsApp, webhook do GitHub) nascem certos sozinhos. Preencha só para forçar um domínio diferente do que o proxy anuncia. Veja 2.2 ⚠️. |
| `SUPABASE_DB_URL` | ✅ *(instalação nova)* | Connection string do **Session pooler (porta 5432)** do Supabase (Settings → Database) — habilita **migrations automáticas no boot** do container; sem ela, migrations seguem manuais (§1/§7). ⚠️ O **transaction pooler (porta 6543) NÃO serve** — o runner usa advisory lock, que é por sessão; mas se você colar o 6543 do Supabase por engano, ele troca pro 5432 sozinho no boot (rede de segurança — prefira já colar o 5432). ⚠️ **NÃO use a Direct connection** (host `db.<ref>.supabase.co`): é IPv6-only → `getaddrinfo ENOTFOUND` no EasyPanel. Tem que ser o host `...pooler.supabase.com` (usuário `postgres.<ref>`, não só `postgres`) — o runner detecta a direct e recusa com instrução clara em vez de estourar `ENOTFOUND`. `?sslmode=` na URL é ignorado (o runner força TLS fora de localhost). ⚠️ **Instalação EXISTENTE:** só configure esta env DEPOIS de aplicar todas as migrations pendentes até a baseline `0046` (§7). Configurá-la antes, numa base pré-baseline, faz o container novo **NÃO SUBIR** (`baseline_missing`, exit 1). |
| `EMBEDDING_MODEL` | — | Default `text-embedding-3-small`. |
| `OPENAI_MODEL` | — | Modelo de chat default (default `gpt-5.1`). |
| `CHEAP_MODEL` | — | Modelo **barato** dos jobs de fundo (reflexão de memória, rollup, curador-crítico, extração jurídica/estúdio). Default `gpt-5-mini` (id real da OpenAI, $0.25/$2.00 por 1M) — corta o custo desses jobs (que rodam sozinhos no heartbeat) sem tocar a qualidade do chat/autoria. ⚠️ Se sua conta OpenAI **não tiver** o mini, cada job cai sozinho pro `OPENAI_MODEL` (fallback automático por model-not-found — a memória nunca quebra). Aponte pro modelo barato que você tem acesso. |
| `OPENAI_REALTIME_VOICE` | — | Voz do Realtime (default `coral`; ex.: `cedar`). |
| `COMPOSIO_USER_ID` | — | Default `operator` — o id sob o qual as contas são conectadas no painel do Composio. |
| `BRAIN_BRANCH` | — | Branch do repo do cérebro (default `main`). |
| `BRAIN_CLONE_DIR` | — | Default `/data/brain` na imagem. Volume opcional (passo 4) — o container conserta a dona do volume sozinho no boot, você não precisa mexer em permissão. |
| `HEARTBEAT_ENABLED` | — | Default `1` — heartbeat interno embutido (ver §6). `0` desliga (use cron externo). |
| `HEARTBEAT_INTERVAL_SECONDS` | — | Default `300` — intervalo entre batidas do heartbeat interno. |
| `HEARTBEAT_BOOT_DELAY` | — | Default `20` — espera (s) antes da 1ª batida (deixa o server subir). |
| `TELEGRAM_ENABLED` | — | Default `1` — loop de long-polling do Telegram embutido (ver §6). `0` desliga. |

### 2.2 Build-time: você NÃO precisa repetir nada na aba "Build"
As `NEXT_PUBLIC_*` são inlinadas no bundle na hora do `build`, mas o app **não depende mais
disso**: o servidor lê a conexão do ambiente a cada request e a entrega ao navegador pelo
próprio documento. Preencher só a env de runtime (2.1) basta.

Passá-las como build-args continua funcionando (nada quebra se você já faz isso), e a
`SUPABASE_SERVICE_ROLE_KEY` **nunca** vai em build-arg, só em runtime.

> 🩹 **Se você deployou antes da v1.24.0 e viu "Your project's URL and Key are required to
> create a Supabase client" em toda página:** era este ponto. O build sem build-args gravava a
> variável como texto VAZIO, que é diferente de ausente, e a alternativa de runtime nunca era
> consultada. Atualize e redeploye; não é preciso mexer em variável nenhuma.

## 3. EasyPanel — criar o app
1. Novo app → **source = este repositório** (build pelo `Dockerfile` na raiz).
2. Preencher as env de runtime (2.1). Não há build-arg obrigatório (2.2).
3. Porta interna: **80** (é o padrão do EasyPanel — deixe como está, não precisa trocar). O
   container escuta na 80 rodando como usuário não-root (via `setcap` no `Dockerfile`); pra usar
   outra porta, basta setar a env `PORT`. Healthcheck: **`/api/health`** (já no `HEALTHCHECK`).
4. ⚠️ **Cole o Gatilho de Implantação.** EasyPanel → app → aba **Implantações** → copie a
   **URL do Gatilho de Implantação** e cole no `/config` → Licença (card Atualizações →
   "Gatilho de Implantação (EasyPanel)"). Com ele, o **Motor dispara o rebuild direto** e a
   atualização sobe sozinha. **Sem** ele, o update 1-clique publica o código no seu repo, mas
   você precisa clicar **Deploy** na mão no EasyPanel (o card avisa isso).

   ⚠️ **Deixe o botão "Deploy Automático" do EasyPanel desligado.** Ele é outra coisa: reconstrói
   o app a cada envio ao GitHub. Ligado junto com o gatilho, cada atualização abre **dois**
   deploys. Versões antigas deste guia mandavam ligá-lo; se você seguiu aquela instrução,
   desligue.
5. ⚠️ **Réplicas = 1, sempre.** O app assume **instância única** (locks e caches em processo; o
   poll do Telegram conflita com ele mesmo em 2 réplicas). NÃO configure réplicas/autoscaling > 1.

## 4. Volume do Segundo Cérebro (opcional)
O clone do cérebro vive em **`/data/brain`**. **Você NÃO precisa de volume** pra funcionar: sem
ele o clone mora na imagem e é re-clonado a cada redeploy (os embeddings ficam no Supabase, então
é barato — o Git é a fonte da verdade; perder o clone não perde nada).

**Se quiser persistir o clone** (evita o re-clone a cada deploy): EasyPanel → app → **Mounts /
Volumes** → **Add Volume** → tipo **Volume**, **mount path `/data/brain`** → salvar e redeploy.
- **Não precisa configurar permissão / chown**: o EasyPanel monta o volume como `root`, mas o
  container **conserta a dona sozinho no boot** (sobe como root só pra `chown` o `/data/brain`
  pro usuário `node` e larga o privilégio na hora — o app roda não-root). É por isso que uma
  versão antiga estourava `EACCES: permission denied ... '/data/brain'` num volume montado; a
  imagem atual resolve isso automaticamente.
- Só **1 volume** e **1 réplica** (o app é instância única — ver §3.5).

## 5. Primeiro boot
1. Abrir o domínio → **o formulário do primeiro acesso cria o operador** (via admin API, que
   funciona **mesmo com o signup público fechado**). O 1º operador vira o operador **CANÔNICO**:
   seu `auth.users.id` é gravado em `operator_identity` (migration 0043) e passa a ser o único
   subject de sessão aceito — o middleware e o `requireOperator` rejeitam, **fail-closed**,
   qualquer JWT com outro subject. Alternativas: Admin do Supabase (Auth → Add user) ou
   `scripts/create-operator.mjs` **da sua máquina** (`.env` local → Supabase de produção;
   `scripts/` não vai na imagem, então não dá pra rodar via `docker exec`).

   > **⚠️ Endurecimento obrigatório (fix P1, auditoria 2026-07-06 — `docs/superpowers/2026-07-06-auditoria-seguranca-completa.md`):**
   > o registro **NÃO fecha sozinho no GoTrue**. O `/auth/v1/signup` público segue alcançável com a
   > anon key (que está no bundle do browser). O binding de operador acima já **bloqueia o atacante
   > de agir** (sessão rejeitada + RLS via `is_operator()` devolve 0 linhas), mas, como
   > defesa-em-profundidade, **desabilite o signup no projeto Supabase**: Dashboard →
   > **Authentication → Sign In / Providers → "Allow new users to sign up" = OFF** (o
   > `config.toml` já vem com `enable_signup = false`, mas isso vale só pro Supabase **local** — o
   > **cloud** precisa do toggle no painel). Mantenha a instância **fechada (rede)** até o 1º login.
2. `/config`: colar OpenAI key + GitHub token + repo; copiar o **webhook secret/URL** gerados e
   registrar no GitHub (Settings → Webhooks); (opcional) colar a **Composio API key**.
3. (Opcional) `/config` → **Canais**: token do **bot do Telegram** (canal proativo do dono —
   briefing, lembretes, aprovações) e credenciais do **WhatsApp Cloud API** (inbox de
   atendimento) — o card mostra a URL do webhook + verify token pra registrar no painel da Meta.
4. `/onboarding`: ritual de nascimento da empresa.
5. (Ações externas) No painel do **Composio**, conectar as contas (Gmail, etc.) **sob o user
   `operator`** (ou o valor de `COMPOSIO_USER_ID`). A API key sozinha não basta — é preciso uma
   conta conectada (`ACTIVE`).
6. (Opcional) `/config` → **Fontes de dados**: ligar o banco de dados do seu próprio negócio
   (loja, ERP, sistema de vendas), para o assistente aprender com ele. Antes de colar a
   conexão, crie o usuário certo no seu banco: veja **§5.1** abaixo.

### 5.1 Conectar o banco do seu negócio (opcional)

Na tela `/config`, o card **Fontes de dados** deixa você ligar o banco de dados do SEU
negócio (não é o Supabase do produto, é o banco da sua loja, do seu ERP, do seu sistema de
vendas). Uma vez ligado, o assistente aprende com ele: você aprova as perguntas, ele roda no
horário marcado e guarda o resultado como nota no seu Cérebro.

**A conexão que você cola ali precisa ser de leitura, sempre. Nunca cole o acesso de
administrador que você já tem em mãos.** O motivo não é excesso de cuidado, é uma lacuna
real: o assistente recusa na hora qualquer consulta cujo texto peça para ler arquivo do
servidor (funções como `pg_read_file`). Só que essa checagem olha o TEXTO da consulta, e
nada além disso. Se o SEU banco já tiver, por exemplo, uma visão (`view`) pré-existente
chamada `relatorio_vendas` que por dentro chama uma dessas funções perigosas, o assistente
não tem como enxergar isso olhando só o nome dela na consulta que ele monta. Nenhum filtro
de texto fecha essa lacuna. Só permissão fecha: a conexão precisa ser de um usuário que
fisicamente **não consegue** fazer nada além de ler tabela, não importa o que a consulta
peça para ele fazer.

**Antes de colar a conexão no `/config`, crie esse usuário no seu banco.** Rode como
administrador (pelo painel do seu banco, ou pelo `psql`):

```sql
create role leitor_awave login password 'escolha-uma-senha-forte-aqui';
grant connect on database nome_do_seu_banco to leitor_awave;
grant usage on schema public to leitor_awave;
grant select on all tables in schema public to leitor_awave;
```

Troque `nome_do_seu_banco` pelo nome real do seu banco e a senha por uma escolhida por você.
O resultado é um usuário `leitor_awave` que só enxerga linhas das tabelas do schema `public`,
e nada além disso.

> ⚠️ **Nunca conceda a este usuário:** `superuser`, `pg_read_server_files` nem
> `pg_signal_backend`. Qualquer um dos três devolve, por outro caminho, o mesmo poder que a
> restrição de leitura existe justamente para tirar (ler arquivo do servidor do banco, ou
> derrubar um processo dele), mesmo que a consulta em si pareça inofensiva.

> ✅ **Isso agora é conferido, não só pedido.** Ao conectar a fonte (e a cada vez que você
> clica em testar uma pergunta), o app pergunta ao seu banco o que aquela conexão pode fazer.
> Se ela tiver poder de administrador, ele **recusa na hora** e explica o que fazer. Se o seu
> banco não responder essa pergunta (versão antiga, ou um servidor que só imita o Postgres),
> ele **não bloqueia**, mas avisa na tela que não deu para confirmar: nesse caso, confirme
> com o responsável pelo seu banco que o acesso colado ali só consegue ler.

> 🔒 **A conexão é criptografada e o certificado é conferido, por padrão.** Sem isso, a senha
> do banco e todas as linhas de todo resultado poderiam ser lidas por quem estivesse no meio
> do caminho da rede. Duas saídas, e as duas são escritas na própria conexão, dentro do
> painel: se o seu banco usa um certificado próprio e recusa a conexão por causa disso,
> acrescente `?sslmode=no-verify` ao final dela (continua criptografado, sem conferir o
> certificado); se o banco roda só na sua própria máquina e não sai para a internet,
> `?sslmode=disable` dispensa a criptografia.

Cole a conexão desse usuário (algo como
`postgres://leitor_awave:sua-senha@endereco:5432/nome_do_seu_banco`) no campo **"Conexão de
leitura do banco"** do card. Se você trocar a senha depois, atualize a conexão no mesmo
lugar.

## 6. Processos de fundo (o "cron" embutido — sem cron externo)

O `docker-entrypoint.sh` sobe o app Next **e dois loops** em background. Você não configura nada.

- **Heartbeat** (`heartbeat-tick.mjs` → `POST /api/heartbeat` a cada `HEARTBEAT_INTERVAL_SECONDS`,
  default **300s**): o guarda-chuva de TODO trabalho periódico — tarefas frias do maestro, fila
  de memória (reflexões / Ficha da conta / rollup), fila de atendimento (WhatsApp), assistente
  proativo (briefing/lembretes) e revalidação de licença + catálogo da Loja. O tick busca o
  segredo **`cron_secret` do Vault** (via `SUPABASE_SERVICE_ROLE_KEY`) e o envia como
  `Authorization: Bearer <segredo>`. Enquanto o app não tiver `cron_secret` no Vault (antes do
  `/config`), o tick só pula (a rota responde `503`) — sem ruído.
  - Env opcionais: `HEARTBEAT_ENABLED` (default `1`; `0` desliga e volta ao só-app),
    `HEARTBEAT_INTERVAL_SECONDS` (default `300`), `HEARTBEAT_BOOT_DELAY` (default `20`).
  - Alternativa (se preferir um cron externo, ex.: o agendador do EasyPanel ou cron-job.org):
    desligue com `HEARTBEAT_ENABLED=0` e aponte o cron p/ `POST /api/heartbeat` com o header
    `Authorization: Bearer <cron_secret>`.
- **Telegram** (`telegram-poll.mjs` → `POST /api/telegram/poll` em loop): long-polling do bot do
  dono. Só faz algo depois de configurar o bot no `/config` → Canais. `TELEGRAM_ENABLED=0`
  desliga (o WhatsApp não precisa de loop — chega por webhook).

## 7. Atualizar pra uma nova versão

**A partir da v1.4.0, com a `SUPABASE_DB_URL` configurada (§2.1), o passo de migrations manuais
desaparece:** no boot de cada deploy o container aplica sozinho as migrations pendentes, ANTES do
server subir — se alguma falhar, o container não sobe e o deploy zero-downtime do EasyPanel
mantém a versão antiga servindo.

> **Deploy sobreposto e anti-réplica:** a sobreposição transitória de containers durante o
> deploy (Zero Downtime) **não gera falso positivo de anti-réplica** — a colisão de curta
> duração é tolerada e a licença não é quarentenada por causa de um deploy. Mantenha
> **`Réplicas = 1`**: o Motor é desenhado para uma réplica (o heartbeat cobre só o fork de
> licença, não o double-poll do Telegram — ver §3).

### 7.1 Update 1-clique (a via normal — já disponível)

O Motor descobre a versão nova pelo heartbeat e mostra o card **"vX.Y.Z disponível"** no `/config`
→ Licença. **Um clique** e o próprio Motor baixa o `.zip` carimbado do Hub, comita a árvore nova no
SEU repo privado (§0) e dispara o rebuild. O card **recomenda** o Deploy Webhook (§3): com ele
configurado, o botão diz **"Atualizar agora"** e o rebuild sobe sozinho; sem ele, o botão diz
**"Atualizar (deploy manual)"** e o card avisa que você precisa clicar Deploy no EasyPanel depois.
Requisitos:

- ⚠️ **Deploy Webhook recomendado** — cole a URL do Gatilho de Implantação do EasyPanel no
  `/config` (§3): o Motor dispara o rebuild direto e a atualização sobe sozinha. Sem o webhook, o
  push acontece normalmente, mas você precisa entrar no EasyPanel e clicar **Deploy** na mão.
- ⚠️ **Cada atualização abre DOIS deploys?** O botão "Deploy Automático" (Auto Deploy) do
  EasyPanel está ligado junto com o gatilho. Desligue o botão e deixe só o gatilho (§3).
- O **token do GitHub salvo no `/config`** precisa de acesso de **escrita também no SEU repo do
  Motor** (o repo privado do §0), não só no repo do Cérebro — é ele que empurra a versão nova.
  Se esse repositório tiver a pasta `.github/workflows`, o token precisa também da permissão
  **Workflows**: sem ela o GitHub recusa o envio da atualização.
- **`SUPABASE_DB_URL` configurada** (§2.1) pras migrations aplicarem sozinhas no boot.

**Via manual (equivalente):** baixe o `.zip` na área de membros (ou puxe a tag), dê push no SEU
repo privado e rebuild/redeploy no EasyPanel (mesmos build-args `NEXT_PUBLIC_*` do §2.2). Nada a
reconfigurar: chaves seguem no Vault do SEU Supabase e o cérebro no SEU repo GitHub.

**Freios do update (3 guardas):**
- **Editou o código?** O Motor detecta (compara o repo contra o manifesto da release), **avisa +
  faz backup das suas mudanças** num branch `awave-backup/pre-vX.Y.Z` e **pede confirmação** antes
  de sobrescrever (o backup é criado ANTES de qualquer overwrite; suas edições nunca somem).
- **Botão diz "deploy manual"?** Significa que o Deploy Webhook ainda não está configurado. Cole a
  URL do Gatilho de Implantação do EasyPanel no `/config` (§3) e o botão passa a disparar o rebuild
  automaticamente. Sem o webhook, o update publica o código e você dá Deploy na mão no EasyPanel —
  funciona da mesma forma, só não é automático.
- **Container novo não subiu?** O card explica a **causa provável** (suas edições / colisão de
  migration no banco) e oferece **[Voltar pra versão anterior]** em 1 clique (reverte o commit do
  update; seguro porque migrations são expand-only).

### 7.2 Vindo de uma versão ANTERIOR à v1.4.0 (migração única)

1. Aplique **TODAS as migrations pendentes, EM ORDEM, até a `0046` inclusive**. Via **recomendada
   (a suportada): Supabase CLI** — `supabase db push` aplica as pendentes em ordem e registra o
   estado. ⚠️ A via manual pelo **SQL Editor é sujeita a erro**: **pular uma migration intermediária
   = drift silencioso** — a `0046` grava a **baseline** e o runner automático passa a assumir que
   tudo até ela já entrou (não reaplica o que faltou).
2. **SÓ ENTÃO** configure a env **`SUPABASE_DB_URL`** (§2.1 — Session pooler, porta 5432). ⚠️ **A
   ordem importa:** configurar essa env numa base pré-baseline (sem a `0046` aplicada) faz o
   container novo **NÃO SUBIR** (`baseline_missing`, exit 1). Aplique tudo até a `0046` PRIMEIRO,
   depois ligue a env.
3. Redeploy. Das próximas versões em diante, o passo de migrations é automático e o update 1-clique
   (§7.1) passa a valer.

## 8. Customizando sem quebrar updates

A pasta **`custom/`** na raiz da sua cópia é **SUA**: tudo dentro dela **sobrevive ao update
1-clique** (§7.1) — o update sobrescreve o resto do repositório, mas nunca toca o `custom/`.
É lá que vivem os 4 pontos de extensão: **tools de agente** (com aprovação humana opcional),
**telas próprias** (abrem em `/c/<slug>`, já no menu), **endpoints de API** (`/api/c/<slug>`,
já autenticados como operador) e **migrations SQL suas** (rodam sozinhas no boot, junto com as
oficiais).

Comece pelo **`custom/README.md`** (o guia) e pelo **`custom/CLAUDE.md`** (instruções pra IA
que te ajuda a programar — as regras de edição segura). Regra dura das migrations: os SEUS
arquivos usam a faixa **9000–9999** (`custom/migrations/9NNN_nome.sql`) — abaixo de 9000 é do
produto, e o boot recusa arquivo fora da faixa com erro claro.

**Branding não é código:** nome do app, nome do assistente, logo e cor de acento se configuram
em **`/config` → Marca** — é config no banco, então também sobrevive a qualquer update.

Editar arquivos **fora** de `custom/` conta como divergência: o update detecta, faz backup num
branch `awave-backup/pre-vX.Y.Z` e pede confirmação (§7.1) — mas a edição some da `main` no
update. Se precisar mudar comportamento, prefira sempre um ponto de extensão.

## 9. Backup

O estado vivo mora em 2 lugares:

- **Supabase** — banco (agentes, conversas, memória indexada, custo, aprovações) + Vault
  (chaves). Use o backup do próprio Supabase (o cloud tem backups automáticos; self-host:
  `pg_dump` agendado).
- **Repo GitHub do Cérebro** — o conhecimento da empresa em markdown versionado. O repo **já é o
  backup** (Git). O volume `/data/brain` é só um clone de trabalho — perder o volume não perde
  nada (re-clona sozinho).

## 10. Notas

- A imagem inclui o diretório **`skills/`** (SKILL.md nativas do Mastra) — copiado explicitamente
  no `Dockerfile` pois o Next standalone não traça diretórios de dados estáticos. O caminho pode
  ser sobrescrito pela env `SKILLS_DIR`.
- A imagem roda como usuário **não-root** (`node`) e inclui o binário **`git`** (o cérebro usa
  `simple-git`).
- Reprodutibilidade: a base é `node:22-bookworm-slim` (tag flutuante de major). Pra builds
  100% reproduzíveis, fixe um digest (`node:22-bookworm-slim@sha256:…`).

## 11. Endurecimento opcional (recomendado)

O motor já é seguro sem estes passos: uma conta criada crua pelo AnonKey do Supabase
fica inerte (não vira membro, não lê dado, o RLS bloqueia). Ainda assim, dois toggles no
painel do Supabase fecham a porta de vez e evitam spam de cadastro:

1. **Desligar cadastro público.** No painel do seu projeto Supabase, vá em Authentication,
   Providers, Email (ou Authentication, Sign In / Providers) e desmarque "Allow new users
   to sign up". Todo o cadastro legítimo (o 1º operador e os convites) roda pelo servidor
   com a chave de serviço, então desligar o signup público não afeta nada, só bloqueia a
   criação de contas via API pública.
2. **Ligar proteção de senha vazada.** Em Authentication, Policies (ou Password), ligue
   "Leaked password protection" (checagem no HaveIBeenPwned). Bloqueia senhas conhecidas
   em vazamentos.

Ambos são opcionais e reversíveis, aplicados uma vez no painel do Supabase.
