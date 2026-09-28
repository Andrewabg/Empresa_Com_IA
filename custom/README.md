# custom/ — o SEU espaço

Esta pasta é **sua**. Tudo aqui dentro **sobrevive às atualizações** do produto —
todo o resto do repositório é sobrescrito no update de 1-clique.

## O que dá pra fazer aqui

| Quero… | Onde |
|---|---|
| Dar uma habilidade nova a um agente (tool) | `custom/tools/index.ts` |
| Criar uma tela minha (abre em `/c/<slug>`) | `custom/pages/index.tsx` |
| Criar um endpoint meu (`/api/c/<slug>`) | `custom/api/index.ts` |
| Criar tabela/coluna minha no banco | `custom/migrations/9NNN_nome.sql` |
| Receber um webhook externo (`/api/hooks/<slug>`) | `custom/webhooks/index.ts` |
| Rodar uma rotina periódica (polling/sync) | `custom/rotinas/index.ts` |
| Pedir um campo de config no `/config` | `custom/config/index.ts` |
| CSS extra em todas as telas | `custom/estilos.css` |

## Regras rápidas

1. **Só mexa dentro de `custom/`** (minúsculo exato). Fora daqui, o update sobrescreve.
2. **Não delete** `tools/index.ts`, `pages/index.tsx`, `api/index.ts`,
   `webhooks/index.ts`, `rotinas/index.ts`, `config/index.ts` nem
   `estilos.css` — pra desativar, esvazie o array (ou o arquivo, no caso do
   CSS). Deletar quebra o build.
3. Rode **`pnpm build`** antes de commitar.
4. Nome/logo da empresa? Isso é **/config → Marca**, não código.

Se quem programa aqui é uma IA (Claude Code, Cursor, Codex…), mande-a ler o
**`custom/CLAUDE.md`** — tem as mesmas regras com exemplos completos de cada
ponto de extensão.
