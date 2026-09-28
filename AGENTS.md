# Regras para agentes de código (Claude Code, Cursor, Codex, …)

> **PÚBLICO-ALVO — leia antes de obedecer.** Este arquivo é para o **COMPRADOR**
> que roda a instalação self-host (produto 1-clique) e quer customizar. As regras
> abaixo (só `custom/`) protegem a customização DELE de sumir no próximo update.
>
> **Se você é o time da Awave desenvolvendo o CORE do Motor** (o repo-fonte
> `awave-agents` / `empresa_ia`, com `docs/superpowers/`, `CHANGELOG.md`, migrations
> em `supabase/migrations/`), **estas regras NÃO se aplicam a você** — editar `src/`
> é exatamente o seu trabalho. Siga o `CLAUDE.md` da raiz, não este arquivo. Não
> perca tempo se perguntando se pode mexer no core: pode. Este `AGENTS.md` não é
> para você.

Este produto é **atualizável por 1-clique**: a cada update, os arquivos do core
são sobrescritos pela versão nova. Por isso (se você é o COMPRADOR customizando):

1. **Você (IA) só pode criar/editar arquivos dentro de `custom/`** — minúsculo
   exato, na raiz do repositório. **Leia `custom/CLAUDE.md` antes de qualquer
   mudança** — ele explica os 8 pontos de extensão (tools, telas, APIs, migrations,
   webhooks, rotinas, config, saída) com exemplos completos.
2. **Arquivos fora de `custom/` são sobrescritos nas atualizações.** Editar o core
   dispara aviso de divergência e a edição some da main no próximo update (fica só
   um backup em branch `awave-backup/pre-<versão>`).
3. Nunca delete `custom/tools/index.ts`, `custom/pages/index.tsx`,
   `custom/api/index.ts`, `custom/webhooks/index.ts`, `custom/rotinas/index.ts`,
   `custom/config/index.ts`, `custom/saida/index.ts` ou `custom/estilos.css` —
   esvazie os arrays (ou deixe `SAIDA = null`, ou o arquivo no caso do CSS).
   Deletar quebra o build.
4. Rode `pnpm build` (nunca `npm`) antes de commitar.
5. Nome/logo/branding não é código: configura-se em **/config → Marca**.

## Os 8 pontos de extensão, em uma linha cada

O detalhe com exemplos completos está em `custom/CLAUDE.md`. **Este resumo é a
fonte mais NOVA:** `custom/` é preservada em toda atualização, então numa
instalação antiga o `custom/CLAUDE.md` continua sendo o do dia da instalação,
enquanto este arquivo aqui viaja em toda versão. Divergiu? Este vale.

| Ponto | Arquivo | Onde aparece |
|---|---|---|
| Tool de agente | `custom/tools/index.ts` | ligada por agente em **/agentes** |
| Tela | `custom/pages/index.tsx` | **/c/&lt;slug&gt;**, no menu lateral |
| Endpoint de API | `custom/api/index.ts` | **/api/c/&lt;slug&gt;**, já autenticado |
| Migration SQL | `custom/migrations/9NNN_nome.sql` | faixa 9000 a 9999, só sua |
| Card de config | `custom/config/index.ts` | um card no **/config** |
| Webhook de entrada | `custom/webhooks/index.ts` | **/api/hooks/&lt;slug&gt;**, público e assinado |
| Rotina periódica | `custom/rotinas/index.ts` | roda no fundo, sem tela |
| Revisor de saída | `custom/saida/index.ts` | antes de cada resposta sair pelos canais |

Três coisas que mudaram e que o `custom/CLAUDE.md` de uma instalação antiga não
conta:

- **O revisor de saída tem que devolver um objeto SIMPLES** (`{ texto }`,
  `{ segurar, motivo }`, ou `null`). Instância de classe, array e `Date` são
  recusados, e a recusa manda TODA resposta daquele revisor para o inbox como
  rascunho, esperando uma pessoa.
- **`{ texto }` substitui a resposta INTEIRA do turno**, então os botões e o
  arquivo que o agente tinha preparado são descartados junto. Para que eles
  continuem valendo, use `{ segurar: true, motivo }`.
- **`ctx.acoes.enviarMensagem` não passa pelo revisor nem pelo aviso de IA**, e
  por isso, dentro de uma tool, marque `requerAprovacao: true` sempre que algum
  pedaço do texto ou do destino vier dos argumentos da tool.
