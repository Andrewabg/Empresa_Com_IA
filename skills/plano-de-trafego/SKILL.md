---
name: plano-de-trafego
description: "Use quando pedirem mídia paga (plano de campanha, estrutura, segmentação, orçamento) ou quando pedirem para INVESTIGAR a conta: por que o ROAS caiu, vale escalar, o criativo cansou, onde o dinheiro está indo sem venda. NÃO dispara campanha; entrega o plano ou a investigação."
---

# Plano de tráfego e investigação da conta

## Quando é plano
1. Busque (`buscarCerebro`) o contexto do negócio: produto, ticket, público e o que já foi testado.
2. Estruture o plano: plataforma (Meta/Google/TikTok), objetivo de campanha, conjuntos/públicos (frio/morno/quente, lookalike, remarketing), criativos sugeridos, orçamento e cronograma.
3. Declare as hipóteses de teste e os KPIs que vão dizer se deu certo (CTR, CPM, CPC, CPA, ROAS, frequência).
4. Emita o plano com `emitirArtefato` (`kind: documento`) e só RESUMA no chat. Você não executa nem dispara a campanha: entrega o plano para o operador aprovar e rodar.

## Quando é investigação
Pergunta de ESTADO ("como está a conta?", "quanto gastei?") se responde pelo relatório. Pergunta
de CAUSA ou de DECISÃO ("por que caiu?", "vale escalar?", "o criativo cansou?", "investiga") pede
investigação. Antes de começar, diga em uma linha o que vai olhar e quanto tempo leva.

O método, sempre nesta ordem:
1. Levante 2 ou 3 hipóteses para a pergunta.
2. Busque o dado que SEPARA as hipóteses, em paralelo quando as leituras não dependem uma da outra.
3. Cruze na bancada em vez de fazer conta de cabeça.
4. Só então julgue, dizendo o número que sustentou cada conclusão.
5. O que você não mediu, declare.
6. Pare quando as hipóteses estiverem separadas: o teto de passos é limite, não meta.

Com a leitura livre (`consultarMeta`) e a bancada (`calcular`), quando existirem nesta instalação,
você busca e cruza o que precisar. Sem elas, use o relatório e diga com clareza qual hipótese ficou
sem como separar.

## Roteiro 1: o ROAS caiu
1. Caiu onde? Compare a semana com a anterior por campanha e depois por conjunto.
2. Caiu porque o gasto subiu ou porque a venda sumiu? Separe gasto, conversões e ticket.
3. Se foi um conjunto: o público cansou (frequência subindo, CTR caindo) ou o leilão encareceu (CPM subindo)?
4. Se foi a conta toda: mudou algo na página ou na oferta? O funil depois do clique segurou?
5. Julgue dizendo o número, e proponha um teste que confirma ou derruba a hipótese.

## Roteiro 2: vale escalar
1. O resultado é sustentado ou é sorte? Quantas conversões sustentam o ROAS: amostra pequena não escala.
2. A frequência ainda tem espaço? Frequência alta com CTR caindo é teto, não oportunidade.
3. Os dias recentes seguram a média ou ela vem de um dia só?
4. Escale em degrau (a casa limita a variação por proposta) e diga o que vai olhar para voltar atrás.

## Roteiro 3: o criativo cansou
1. Leia o anúncio por dia: CTR e custo por resultado nas duas últimas semanas.
2. Frequência subindo junto com CTR caindo é cansaço; CTR estável com CPM subindo é leilão.
3. Compare com os outros anúncios do mesmo conjunto: é o criativo ou o público?
4. Se cansou, peça a variação (o Téo cria a arte) e diga o que a nova precisa testar.

Se o painel diz uma coisa e a investigação diz outra, diga as duas e o porquê.
