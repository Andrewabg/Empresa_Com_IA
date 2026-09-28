# Suas migrations SQL

Coloque aqui o SQL das SUAS tabelas/colunas. Elas rodam **no boot do container**,
junto com as migrations oficiais do produto — você não precisa rodar nada na mão.

## Regras (obrigatórias)

1. **Nome do arquivo:** `9NNN_nome.sql` — a faixa **9000–9999 é obrigatória**
   (ex.: `9001_minha_tabela.sql`). A faixa abaixo de 9000 é do core; uma migration
   sua fora da faixa faz o runner **RECUSAR o boot** (exit 1) com erro claro
   nomeando o arquivo — numa atualização, o container ANTIGO continua no ar.
   Renomeie pra faixa 9000+ e rode de novo.
2. **Expand-only:** só crie coisas novas (`CREATE TABLE`, `ADD COLUMN`, índices).
   **Nunca** `DROP`/`RENAME` de nada que o core usa — o update automático supõe que
   o schema do core está intacto.
3. **Idempotência ajuda:** prefira `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`.
   Cada arquivo roda UMA vez (fica registrado), mas idempotência salva em re-instalações.
4. **A zona é `custom/` minúsculo exato** (case-sensitive): `Custom/` ou `CUSTOM/`
   NÃO são preservados no update — só `custom/` conta.

## Exemplo

`custom/migrations/9001_meu_estoque.sql`:

```sql
create table if not exists meu_estoque (
  sku text primary key,
  quantidade integer not null default 0,
  atualizado_em timestamptz not null default now()
);
```
