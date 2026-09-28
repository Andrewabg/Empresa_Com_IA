# Awave Agents

**Sua empresa de IA, self-host.** Um time de funcionários de IA — assistente pessoal por voz e
chat, COO, gestor de tráfego, copywriter, designer, jurídico, atendimento — rodando **na sua
infra**, com as **suas chaves**, aprendendo o seu negócio num **Segundo Cérebro** versionado
em Git.

- **1 container** (`Dockerfile` na raiz) + 1 projeto **Supabase**. Deploy típico: EasyPanel numa VPS.
- **Chaves suas (BYO):** OpenAI, GitHub e — opcionais — Composio, Telegram e WhatsApp Cloud API.
  Tudo plugado pelo dashboard **`/config`** (Supabase Vault) — **sem programar, sem `.env` de
  segredos**.
- **Autonomia com freios:** toda escrita externa (e-mail, memória sensível, ações) passa por
  aprovação humana em **`/aprovacoes`**.
- **Seu dado é seu:** a memória da empresa vive em markdown num repo GitHub **seu** + no Supabase
  **seu**. O motor roda offline pra sempre — a licença só destrava o conteúdo vivo (Loja de
  cargos, skills, updates).

## Comece aqui

➡️ **[docs/DEPLOY.md](docs/DEPLOY.md)** — o guia completo, do `.zip` ao ar: repo privado →
EasyPanel → migrations → primeiro boot.

Depois do deploy: o **primeiro acesso cria o operador** (o registro fecha em seguida), o
**`/config`** guia as chaves passo a passo, e o **`/onboarding`** é o ritual de nascimento da
sua empresa.

## O que vem dentro

| Rota | O quê |
|---|---|
| `/` | Command Center — a empresa viva, em tempo real |
| `/conversa` | Chat + voz (OpenAI Realtime) com o seu assistente |
| `/cerebro` | O Segundo Cérebro — o conhecimento da empresa em grafo |
| `/loja` | Contrate novos funcionários de IA (cargos curados) |
| `/trafego` `/copy` `/design` `/juridico` `/inbox` | Cockpits dos especialistas |
| `/organograma` `/agentes` | O time: quem responde a quem, ficha de cada um |
| `/aprovacoes` `/custo` `/config` | Freios (HITL), gasto por agente e chaves |

## Licença

Uso licenciado — ver **[LICENSE](LICENSE)** (Licença de Uso Sustentável: uso interno liberado;
revenda/SaaS/redistribuição, não). Cada cópia é carimbada com a identidade do licenciado
(`src/server/awave-stamp.json`).
