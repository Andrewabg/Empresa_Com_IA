# custom/ — a SUA zona de customização (leia antes de mudar qualquer coisa)

Você (IA assistente do dono desta instância) está num produto **atualizável por
1-clique**. Estas regras existem pra que as customizações do dono **sobrevivam a
todo update**. Siga-as à risca.

> **ESTE ARQUIVO PODE ESTAR ATRASADO, e é de propósito.** Ele mora dentro de
> `custom/`, a pasta que o update NUNCA sobrescreve, pela mesma proteção que
> guarda o código do dono. A consequência é que uma instalação antiga fica com a
> versão dele do dia em que foi instalada, mesmo depois de atualizar o produto.
> Quem viaja em toda atualização é o **`AGENTS.md` da raiz**: ele resume os
> pontos de extensão e é a fonte mais nova. Divergiu dos dois? O da raiz vale.

## 1. Regra de ouro

**Só crie/edite arquivos DENTRO de `custom/`** — minúsculo exato, case-sensitive
(`Custom/` ou `CUSTOM/` NÃO são preservados). **Todo o resto do repositório é
sobrescrito na próxima atualização** do produto. Se algo fora de `custom/` for
editado, o update ainda faz um backup do estado atual num branch
`awave-backup/pre-<versão>` — mas a edição SOME da main. Não conte com isso:
trabalhe dentro de `custom/`.

## 2. Os 8 pontos de extensão

### 2.1 Tool de agente — `custom/tools/index.ts`

Registre no array `TOOLS`; depois ligue a tool por agente na tela `/agentes`.
`requerAprovacao: true` faz a execução virar uma APROVAÇÃO em `/aprovacoes`
(humano decide) em vez de rodar na hora — use em tudo que escreve/gasta/envia.

```ts
import { z } from 'zod'
import { definirToolCustom, type ToolCustom } from '@/server/custom/contrato'

const baixarEstoque = definirToolCustom({
  id: 'baixar_estoque', // snake_case, 3-40 chars, começa com letra, único
  titulo: 'Baixar estoque',
  descricao: 'Use quando o usuário pedir para dar baixa em unidades de um produto do estoque.',
  inputSchema: z.object({
    sku: z.string().describe('Código do produto'),
    quantidade: z.number().int().positive().describe('Unidades a baixar'),
  }),
  requerAprovacao: true, // escreve no banco ⇒ passa por /aprovacoes (HITL)
  execute: async (ctx, input) => {
    const { sku, quantidade } = input // já tipado a partir do inputSchema (sem cast)
    const db = ctx.db() // Supabase com service role — acesso total às SUAS tabelas
    const { data: atual, error: erroLeitura } = await db
      .from('meu_estoque').select('quantidade').eq('sku', sku).maybeSingle()
    if (erroLeitura) throw new Error(`Falha ao ler estoque: ${erroLeitura.message}`)
    if (!atual) throw new Error(`SKU "${sku}" não existe em meu_estoque`)
    const restante = Math.max(0, atual.quantidade - quantidade)
    const { error } = await db.from('meu_estoque').update({ quantidade: restante }).eq('sku', sku)
    if (error) throw new Error(`Falha ao baixar estoque: ${error.message}`)
    return { sku, baixado: quantidade, restante }
  },
})

export const TOOLS: ToolCustom[] = [baixarEstoque]
```

O `ctx` (tipo `CustomCtxV2`) traz: `agentId`, `operatorId`, `conversationId`,
`db()` (client Supabase service-role), `getSetting(chave)` (lê a tabela `settings`,
`null` se ausente), `getSecret`/`setSecret` (Vault, só chaves `custom_*`) e a fachada
`acoes`. O `input` chega validado pelo `inputSchema` e já **tipado a partir dele**
(via `definirToolCustom`) — use `input.sku` direto, sem cast. Se mudar o `inputSchema`,
o TypeScript reclama no `execute` na hora (erro cedo).

**O ctx é o MESMO nos dois caminhos.** Com `requerAprovacao`, a tool roda depois, quando
o dono aprova, mas recebe exatamente o que receberia na hora — inclusive `getSecret` e
`acoes`. Aprovar muda QUANDO ela roda, nunca O QUE ela recebe.

### 2.2 Tela — `custom/pages/index.tsx`

Cada página registrada abre em **`/c/<slug>`**, já com o menu lateral do produto.

```tsx
import { definirPaginaCustom, type PaginaCustom } from '@/server/custom/contrato'

function PainelEstoque() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold">Painel de estoque</h1>
      <p className="mt-2 text-sm opacity-70">Esta tela é sua — abre em /c/painel-estoque.</p>
    </div>
  )
}

const painelEstoque = definirPaginaCustom({
  slug: 'painel-estoque', // kebab-case, 3-40 chars, único
  titulo: 'Painel de estoque',
  Componente: PainelEstoque,
})

export const PAGINAS: PaginaCustom[] = [painelEstoque]
```

CSS extra vai em `custom/estilos.css` (carregado em todas as telas).

### 2.3 Endpoint de API — `custom/api/index.ts`

Cada endpoint registrado atende **`/api/c/<slug>`**. O core aplica a autenticação
de OPERADOR **antes** de chamar o seu handler — você não precisa checar login.
Na v1 só existem **GET e POST** em `/api/c/` (outros métodos não são despachados).

```ts
import { definirApiCustom, type ApiCustom } from '@/server/custom/contrato'

const estoque = definirApiCustom({
  slug: 'estoque', // kebab-case, 3-40 chars, único
  GET: async (_req, ctx) => {
    const { data } = await ctx.db().from('meu_estoque').select('sku, quantidade')
    return Response.json({ itens: data ?? [] })
  },
  POST: async (req, ctx) => {
    const corpo = (await req.json()) as { sku?: string; quantidade?: number }
    if (!corpo.sku) return Response.json({ erro: 'sku obrigatório' }, { status: 400 })
    await ctx.db().from('meu_estoque').upsert({ sku: corpo.sku, quantidade: corpo.quantidade ?? 0 })
    return Response.json({ ok: true })
  },
})

export const APIS: ApiCustom[] = [estoque]
```

### 2.4 Migration SQL — `custom/migrations/9NNN_nome.sql`

SQL das SUAS tabelas. Roda sozinho no boot, junto com as oficiais. A faixa
**9000–9999 é obrigatória**; **expand-only** (nunca DROP/rename do que o core usa).
Detalhes e exemplo em `custom/migrations/LEIA-ME.md`.

```sql
-- custom/migrations/9001_meu_estoque.sql
create table if not exists meu_estoque (
  sku text primary key,
  quantidade integer not null default 0
);
```

Os três pontos a seguir (config, webhooks, rotinas) formam um **conjunto**: um caso
comum é receber um webhook de uma ferramenta externa (Hotmart, um CRM) usando um
segredo que o dono cola num campo de config, e uma rotina que faz o sync no sentido
inverso. O exemplo abaixo é ponta a ponta com esse trio.

### 2.5 Config no /config — `custom/config/index.ts`

Declare os campos que o dono precisa preencher (chaves de API, tokens, URLs). Cada
um vira um **card no `/config`**. Tipo `segredo` mascara o valor e grava no Vault;
`texto`/`url` gravam na tabela `settings`. Convenção: nomeie a chave com prefixo
`custom_`.

```ts
import { definirConfigCustom, type ConfigCustom } from '@/server/custom/contrato'

const hottok = definirConfigCustom({
  chave: 'custom_hotmart_hottok', // prefixo custom_ por convenção
  rotulo: 'Hottok da Hotmart',
  tipo: 'segredo', // mascara e grava no Vault (texto/url gravam em settings)
})

export const CONFIGS: ConfigCustom[] = [hottok]
```

O dono abre o `/config`, vê o card "Hottok da Hotmart", cola a chave e salva. A partir
daí o webhook e a rotina leem esse valor por `ctx.getSecret('custom_hotmart_hottok')`,
sem você tocar em código de novo.

### 2.6 Webhook de entrada — `custom/webhooks/index.ts`

Registre no array `WEBHOOKS`. Cada webhook atende **`/api/hooks/<slug>`** (URL pública
que o dono cola no painel da ferramenta externa). O core cuida de **verificar a
assinatura, responder o ACK (200) na hora, garantir idempotência e refazer a entrega
em caso de erro (retry)**. Você **não implementa nada disso**, só declara o
descriptor `auth` e escreve o `processar`.

```ts
import { definirWebhookCustom, type WebhookCustom } from '@/server/custom/contrato'

const vendas = definirWebhookCustom({
  slug: 'vendas', // a URL vira /api/hooks/vendas (cole na Hotmart)
  // O core lê o segredo do Vault pelo NOME (não o valor) e valida ANTES de chamar processar.
  auth: { tipo: 'token', em: 'query', param: 'hottok', segredo: 'custom_hotmart_hottok' },
  // Chave de dedup: mesma transação chega 1× só (o core descarta a repetida).
  dedupDe: 'body.data.purchase.transaction',
  processar: async (evento, ctx) => {
    // `evento.body` é `unknown` (o corpo vem de fora) — faça o narrowing você mesmo:
    const b = evento.body as {
      event?: string
      data?: { buyer?: { name?: string; email?: string } }
    }
    if (b.event !== 'PURCHASE_APPROVED') return // ignore os outros eventos

    const nome = b.data?.buyer?.name ?? 'cliente'
    // ctx é o V2: além de db()/getSetting, tem getSecret/setSecret e a fachada acoes.
    await ctx.acoes.notificar({
      titulo: 'Venda nova aprovada',
      corpo: `${nome} acabou de comprar.`,
      urgencia: 'imediata',
    })
    // `agente` é o ID DA FUNÇÃO, não o primeiro nome: a Sofia é `atendimento`, o Davi é
    // `vendedor`. Veja os ids em Agentes, na ficha de cada um.
    await ctx.acoes.criarTarefa({
      agente: 'atendimento',
      descricao: `Dar boas-vindas ao ${nome} (${b.data?.buyer?.email ?? 'sem e-mail'}).`,
    })
  },
})

export const WEBHOOKS: WebhookCustom[] = [vendas]
```

Fluxo do core (você não escreve nada disso): recebe o POST em `/api/hooks/vendas`,
confere o `hottok` da query contra o segredo do Vault, responde 200 na hora
(ACK-then-queue), garante que a mesma transação não processa duas vezes (idempotência
via `dedupDe`) e chama o seu `processar` no heartbeat, com retry se ele lançar erro.
Assinatura inválida nunca chega no `processar` (o core rejeita com 401).

O `auth` é um conjunto **fechado** (a segurança mora no core): token na query, token
no header, ou HMAC no header (hex/base64). Você escolhe qual, o core valida.

### 2.7 Rotina periódica — `custom/rotinas/index.ts`

Registre no array `ROTINAS`. Cada rotina roda no heartbeat a cada `cadaMinutos`
(intervalo mínimo). Bom para polling/sync (puxar de um CRM, empurrar para uma
planilha). Opcional: se você não tem nada periódico, deixe o array vazio.

```ts
import { definirRotinaCustom, type RotinaCustom } from '@/server/custom/contrato'

const syncCrm = definirRotinaCustom({
  id: 'sync_crm', // snake_case, único (chave de agendamento/idempotência)
  cadaMinutos: 30, // roda no máximo a cada 30 min
  executar: async (ctx) => {
    const key = await ctx.getSecret('custom_crm_key') // lê a chave que o dono colou no /config
    if (!key) return // config ainda não preenchida, não faz nada
    // ... fetch no CRM usando `key`, depois grava o resultado em ctx.db() ...
    // const contatos = await fetch('https://crm.exemplo/api', { headers: { Authorization: `Bearer ${key}` } })
    // await ctx.db().from('meus_contatos').upsert(...)
  },
})

export const ROTINAS: RotinaCustom[] = [syncCrm]
```

**Sobre o `ctx` de webhooks e rotinas (o V2):** é maior que o das tools. Além de
`db()` e `getSetting(chave)`, ele traz `getSecret(nome)`/`setSecret(nome, valor)`
(Vault) e a fachada `ctx.acoes` (`notificar`, `criarTarefa`, `criarAprovacao`,
`enviarMensagem` — ver seção 3), o caminho recomendado para o seu código tocar
o resto do sistema.

### 2.8 Revisor de saída — `custom/saida/index.ts`

Roda logo ANTES de a resposta do agente sair, nos **canais de atendimento**
(WhatsApp, Instagram), nos **dois modos** (autônomo e supervisionado). Não
existe fora do atendimento: o chat do painel e o Telegram do dono não passam
por aqui.

O prazo é curto de propósito, **3 segundos**, para COMPARAR e DECIDIR, nunca
para chamar uma API externa. Estourar o prazo ou o revisor lançar erro têm a
MESMA consequência: a resposta **não vai para o cliente**. Ela vira um
rascunho no inbox, para uma pessoa decidir. Essa escolha é o OPOSTO do resto
do produto, que prefere responder mesmo com uma falha ao lado: aqui, quem
instalou um revisor instalou justamente porque a frase do modelo NÃO pode
sair sozinha, então a falha do revisor tem que travar a autonomia, não abrir
uma exceção nela.

```ts
import { definirRevisorDeSaida, type RevisorDeSaida } from '@/server/custom/contrato'

const TEXTO_APROVADO =
  'Para a sua segurança, um instrutor vai falar com você antes de qualquer reserva. ' +
  'Já avisei a equipe e alguém retorna neste mesmo contato.'

const SINAIS = ['hipertens', 'cardíac', 'cardiac', 'gestante', 'grávid', 'gravid', 'epilep']

export const SAIDA: RevisorDeSaida | null = definirRevisorDeSaida({
  async revisar(texto, ctx) {
    const dito = ctx.mensagemDoCliente.toLowerCase()
    if (SINAIS.some((s) => dito.includes(s))) return { texto: TEXTO_APROVADO }
    return null // sem opinião: a resposta original segue como estava
  },
})
```

`revisar` recebe o texto que o agente ia mandar e o `ctx` do turno (conversa,
agente, canal, destino e `ctx.mensagemDoCliente`). Um detalhe que não é
óbvio: `mensagemDoCliente` já chega **legível**, não crua. Quando o cliente
manda um áudio, é a TRANSCRIÇÃO dele; quando manda uma foto, é a DESCRIÇÃO da
imagem. Não é preciso tratar áudio e foto como casos especiais, é só comparar
o texto normalmente.

O que `revisar` pode devolver:

- `null` (ou não devolver nada) — sem opinião, a resposta original sai como
  estava;
- `{ texto: '...' }` — troca o texto que vai sair pelo que você devolveu;
- `{ segurar: true, motivo: '...' }` — a resposta NÃO vai para o cliente. Vira
  rascunho no inbox, com o motivo visível para quem for decidir.

**Devolva um objeto SIMPLES**, escrito ali mesmo (`{ texto }`, `{ segurar }`) ou
montado sem protótipo. Instância de classe, array e `Date` são recusados de
propósito: o que sai dali dependeria de como a próxima camada lê a propriedade,
e onde não dá para provar o que a forma significa o sistema recusa a forma
inteira. A recusa não é silenciosa, mas custa caro: TODA resposta daquele
revisor vira rascunho no inbox, esperando uma pessoa. Se você monta o retorno
numa classe, devolva os campos dela num objeto novo.

**`{ texto: '' }` (ou só espaços) não é jeito de dizer "não manda nada".** É
um formato inválido, e o sistema trata como se o revisor tivesse falhado: a
mensagem também vira rascunho seguro. Para não mandar nada de propósito, use
`{ segurar: true, motivo: '...' }`, que tem destino, uma pessoa no inbox.
Devolver texto vazio em silêncio é exatamente o que este produto proíbe em
qualquer ponto do turno.

Quando a resposta segurada é a PRIMEIRA da conversa, o rascunho que nasce no
inbox carrega o aviso de identificação de IA na frente do texto, do mesmo
jeito que qualquer primeira resposta carregaria se tivesse saído direto.
Quem aprovar o rascunho na tela está aprovando o texto exatamente como o
cliente vai lê-lo.

**`{ texto }` substitui a resposta INTEIRA daquele turno.** No mesmo turno o
agente pode ter preparado botões clicáveis ou anexado um arquivo do catálogo,
e os dois sairiam logo depois do texto, escritos por ele. Como o seu revisor
não vê nem os botões nem a legenda do arquivo, uma substituição que deixasse
os dois passar não seria garantia nenhuma: sairia o seu texto aprovado
("um instrutor vai falar com você antes de qualquer reserva") e, atrás dele,
`[Confirmar reserva]`. Então, ao devolver `{ texto }`, os botões e o arquivo
daquele turno são descartados. Se você quer que o cliente continue recebendo
o que o agente preparou, use `{ segurar: true, motivo: '...' }`: ali nada vai
para o cliente e o rascunho no inbox mostra o texto E a proposta de arquivo ou
de botões, para a pessoa decidir vendo tudo.

## 3. Enviar mensagem sem passar pelo modelo — `ctx.acoes.enviarMensagem`

Disponível dentro de **tools**, **webhooks** e **rotinas**, em qualquer lugar
que o seu código receba um `ctx`. Serve para mandar uma mensagem transacional
pelo WhatsApp ou Instagram sem o modelo escrever nada, por exemplo uma
confirmação de agendamento, um aviso de pagamento, um lembrete. O core
resolve o canal, normaliza o destino, garante que a mesma mensagem não sai
duas vezes, grava no histórico e devolve um resultado que você pode conferir.

```ts
const resultado = await ctx.acoes.enviarMensagem({
  destino: '(11) 99999-9999', // número com máscara funciona: o core reduz aos dígitos
  texto: 'Sua consulta de amanhã foi confirmada às 14h.',
  dedupKey: `confirmacao-agendamento:${agendamentoId}:${contatoId}`, // obrigatório, ver abaixo
})

if (resultado.enviado) {
  console.log('saiu, id no provedor:', resultado.mensagemId)
} else {
  console.log('não saiu:', resultado.motivo, resultado.detalhe)
}
```

**`dedupKey` é obrigatória**, e é ela que garante que a MESMA chave nunca
manda duas vezes, para sempre, mesmo que o seu código chame `enviarMensagem`
outra vez (uma rotina que roda de novo, um webhook reentregue). Use algo que
identifique o EVENTO **e o destinatário**, nunca o instante:
`confirmacao-agendamento:<id do agendamento>:<id do contato>`. A chave é
única na instalação inteira, não por destino: uma chave só com o id do
evento entrega ao primeiro destinatário e devolve `duplicado` para todos os
outros, e uma chave com a hora atual não deduplica nada.

**Nunca ponha o telefone (nem outro dado pessoal) dentro da `dedupKey`.**
"Para sempre" acima é literal: a linha que guarda a chave nunca é apagada, e
a faxina de 90 dias que tira o telefone do envio (`destino`, `erro`,
`external_id`) não toca a `dedupKey` de propósito, porque apagar a chave
destravaria a duplicata que ela existe para impedir. Um dado pessoal
colocado dentro dela sobrevive para sempre, escondido, mesmo depois da
faxina. Use um id estável do seu sistema (o id do agendamento, o id do
contato/cliente), nunca o telefone.

**Sem `canalId`, com mais de um canal habilitado, a chamada é recusada de
propósito.** Se a sua instalação só tem um canal de atendimento ligado, pode
omitir `canalId` e o core usa aquele. Com dois ou mais, informe qual. O core
nunca escolhe "o primeiro" no seu lugar, isso teria que ser uma decisão sua.

Quando a mensagem não sai, `resultado.motivo` diz por quê:

| `motivo` | O que significa |
|---|---|
| `duplicado` | Já existe um envio com esta `dedupKey`. O `detalhe` diz QUAL caso é: a mensagem já chegou ao destino (com o identificador dela na operadora), aquele envio falhou (com o motivo), um envio com essa chave começou agora e ainda está rodando, ou a reserva ficou presa sem desfecho. |
| `fora_da_janela` | A operadora só aceita texto livre até 24h depois da última mensagem do cliente. O `detalhe` distingue os dois casos: o contato nunca escreveu neste canal, ou a última mensagem dele passou de 24h. |
| `canal_ambiguo` | Não veio `canalId` e há mais de um canal habilitado. |
| `canal_ausente` | O `canalId` informado não existe ou está desligado, ou não há nenhum canal habilitado. |
| `teto_atingido` | Mais de 100 envios nesta instalação na última hora, ver abaixo. |
| `recusado_pelo_provedor` | O WhatsApp ou o Instagram recusou o envio, ou a resposta dele não chegou a tempo; o motivo vem em `detalhe`. |

**Cuidado com `recusado_pelo_provedor`: ele NÃO garante que nada saiu.** Ele
cobre tanto a recusa explícita quanto o caso em que a operadora já tinha
aceitado a mensagem e a resposta se perdeu no caminho. Nesse segundo caso o
cliente RECEBEU o texto. Por isso não retente com uma chave nova: você
mandaria a mesma mensagem duas vezes. Retentar com a MESMA chave é seguro (ela
segue ocupada e o resultado vira `duplicado`), e o certo é olhar a conversa no
Inbox antes de decidir mandar outra coisa.

**A reserva presa é o único caso em que a chave fica ocupada sem desfecho.**
Ela aparece quando a instalação para no meio do disparo, e o `detalhe` do
`duplicado` a nomeia. Não existe retomada automática, de propósito: esse mesmo
estado também é o que sobra quando a operadora aceitou a mensagem e só o
registro dela falhou, então retomar sozinho mandaria o texto duas vezes ao
cliente. Confira a conversa no Inbox e, se ela não chegou, mande com uma chave
nova.

**Esta operação NÃO é a mesma coisa que o agente respondendo.** As duas mandam
mensagem pelo mesmo canal, e só uma delas passa pelos freios do atendimento:

| | resposta do agente | `ctx.acoes.enviarMensagem` |
|---|---|---|
| Revisor de saída (`custom/saida`) | passa | **não passa** |
| Aviso de identificação de IA | entra automático na primeira da conversa | **não entra** |
| Modo supervisionado (rascunho no inbox) | respeita | **não respeita, sai na hora** |
| Texto longo | sai quebrado em bolhas | recusado acima do limite |
| Janela de 24h da operadora | respeita | respeita |
| Registro no histórico do Inbox | sim, como fala do agente | sim, assinada como "Automação" |

Isso é o desenho, não um esquecimento: esta operação existe para mensagem
TRANSACIONAL, escrita por você, palavra por palavra, e revisar de novo um
texto que você mesmo escreveu não protegeria de nada. A consequência prática é
que o texto que você passar aqui é o texto que o cliente lê, sem nenhuma
camada no meio.

**Por isso, dentro de uma tool, marque `requerAprovacao: true` sempre que
algum pedaço do `texto` ou do `destino` vier dos argumentos da tool.** Quem
escolhe os argumentos de uma tool é o modelo, e sem aprovação você teria
entregado a ele um jeito de mandar mensagem ao cliente sem revisor e sem aviso
de IA, que é justamente o que o revisor de saída existe para impedir. Em
webhook e em rotina o texto é seu e a ressalva não se aplica.

**O teto é de 100 envios por hora, por instalação.** Ele existe para segurar
um laço acidental no seu código, o cenário que queimaria o número do dono na
Meta, e não para limitar o dono de propósito. Quando ele morde, o dono
recebe um aviso automático explicando que alguma automação pediu envios
demais, porque um teto que corta em silêncio seria pior que nenhum teto.

**Envolva a chamada num `try`/`catch`.** Os casos previsíveis do canal (canal
ausente ou ambíguo, janela fechada, teto, chave repetida, recusa da operadora)
vêm no `resultado`, sem exceção. Mas duas classes de problema LANÇAM:

1. **erro de quem chamou**, e aqui lançar é de propósito, para o defeito
   aparecer no primeiro disparo em vez de virar silêncio:
   - `destino`, `texto` ou `dedupKey` vieram em branco. Um valor feito só de
     caracteres invisíveis (espaço de largura zero, marca de direção) conta
     como em branco: ele passa despercebido na revisão e viraria uma chave
     impossível de repetir ou uma bolha vazia no WhatsApp do cliente;
   - o texto vira nada depois da conversão para o formato do canal, o que
     acontece com uma linha separadora de tabela markdown sozinha;
   - o texto passa do limite de caracteres do canal. O limite é medido no
     texto já convertido para o formato do canal, e essa conversão pode
     deixar o texto MAIOR do que o que você escreveu, por exemplo um texto
     com tabelas ou formatação cresce bastante na conversão.
2. **falha de infraestrutura** no meio do caminho: a leitura dos canais, a
   consulta da janela de 24h ou a gravação da reserva de idempotência. São
   idas ao banco de dados da instalação, e quando ele não responde não há
   resultado honesto a devolver. Um soluço assim acontece ANTES de qualquer
   byte sair, então repetir a chamada com a MESMA `dedupKey` é seguro.

Depois que a operadora aceita a mensagem nada mais lança: daquele ponto em
diante o envio devolve `enviado: true` mesmo que o registro no histórico
falhe, porque devolver erro faria você reenviar e o cliente receber duas
vezes. Se o registro falhar, o dono recebe um aviso no painel dizendo o que
saiu e qual o identificador dela na operadora.

### Para quem o `enviarMensagem` consegue escrever

Depende do provedor do canal, e a diferença é grande:

- **WhatsApp Cloud (oficial) e Instagram**: só para quem falou com você nas últimas 24 horas.
  Fora disso o retorno é `{ enviado: false, motivo: 'fora_da_janela' }`. A Meta recusaria de
  qualquer forma, então o core nem tenta.
- **UAZAPI (não oficial)**: não existe janela, então o disparo alcança **qualquer número**.

Isso importa quando o gatilho do envio vem de fora. Todo webhook da sua pasta `custom/`
obriga autenticação, o core confere a assinatura antes de chamar o seu código, e o teto é de
100 envios por hora por instalação. Ainda assim, num canal UAZAPI o **seu código** é o que
decide para quem a mensagem vai: valide o destino contra a sua base antes de disparar, em vez
de confiar no que chegou no evento.

Este mesmo aviso está no comentário de `ctx.acoes.enviarMensagem`, no arquivo
`src/server/custom/contrato.ts` do core — ali aparece direto no seu editor quando você digita
`ctx.acoes.enviarMensagem(`, e é o lugar que chega a toda instalação já publicada (este
arquivo só é escrito uma vez, na instalação nova). Se um dia mudar aqui, mude lá também.

## 4. Regras duras dos arquivos de registro

`custom/tools/index.ts`, `custom/pages/index.tsx`, `custom/api/index.ts`,
`custom/webhooks/index.ts`, `custom/rotinas/index.ts`, `custom/config/index.ts`,
`custom/saida/index.ts` e `custom/estilos.css` são importados pelo core. Três
regras invioláveis:

1. **Nunca delete nenhum deles** — deletar quebra o build. Pra "zerar" um ponto
   de extensão, **esvazie o array** (`export const TOOLS: ToolCustom[] = []`, e
   o mesmo vale para `WEBHOOKS`, `ROTINAS` e `CONFIGS`); pra "zerar" o revisor
   de saída, deixe `export const SAIDA = null` (ele não é um array, é um valor
   único); pra "zerar" o CSS, **esvazie o arquivo** (o `estilos.css` é
   importado pelo layout — deletá-lo também quebra o build).
   (A rede do EasyPanel mantém o container antigo no ar se o build falhar, mas é
   atrito evitável.)
2. **Nada de código executando no TOPO dos arquivos de registro** — só defina e
   exporte (código roda dentro de `execute`, dos handlers e dos componentes).
   Efeito colateral no topo roda em TODO boot/bundle e pode derrubar tudo.
3. **NUNCA coloque `'use client'` no `custom/pages/index.tsx`** — componente
   interativo vai num arquivo separado (ex.: `custom/pages/MinhaTela.client.tsx`)
   com `'use client'` no topo, e o index importa.

## 5. Antes de commitar: `pnpm build`

Rode `pnpm build` e confirme que compila. Dois tipos de erro, dois momentos:
erros de **CÓDIGO** (type errors) quebram o `pnpm build`; erros de **REGISTRO**
(id/slug duplicado ou malformado, `inputSchema` que não é `z.object`) são dados
que o compilador não enxerga — e cada superfície reage do seu jeito, sempre com
a mensagem apontando o arquivo a corrigir: **telas** mostram o erro ao abrir
`/c/<slug>`; **endpoints** respondem 503 com a mensagem; **tools** somem do
`/agentes` e do chat em silêncio (o chat nunca cai por causa do registro — o
erro aparece no log e ao tentar salvar os toggles). Conserte antes de publicar.
Use sempre `pnpm` (nunca `npm`).

## 6. Branding NÃO é código

Nome, logo e identidade da empresa se configuram em **/config → Marca** — não
edite código pra isso.

## 7. Onde as coisas aparecem

- Telas: **`/c/<slug>`** (entram no menu lateral com o `titulo`).
- Endpoints: **`/api/c/<slug>`** — já autenticados como operador.
- Tools: ligadas por agente em **/agentes**; com `requerAprovacao`, passam por **/aprovacoes**.
- Webhooks: **`/api/hooks/<slug>`** — públicos, com a assinatura verificada pelo core (é a URL que você cola na ferramenta externa).
- Config: um **card no `/config`** (o dono cola a chave; `segredo` vai pro Vault).
- Rotinas: rodam no fundo (heartbeat), sem tela.
- Revisor de saída: sem tela própria, roda antes de cada resposta sair pelos canais de atendimento (WhatsApp/Instagram), nos dois modos.
- `ctx.acoes.enviarMensagem`: sem tela nem rota, é chamado de dentro de tools, webhooks ou rotinas.
