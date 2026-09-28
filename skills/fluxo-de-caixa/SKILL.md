---
name: fluxo-de-caixa
description: Use quando pedirem fluxo de caixa, projeção, cobrança de inadimplente ou visão de margem. Produz a projeção/régua prontas com números REAIS informados.
---

# Fluxo de caixa de 13 semanas + régua de cobrança

Quando acionada:
1. Busque (`buscarCerebro`) os números reais (recebíveis, contas a pagar, fixos, prazos). NUNCA invente número — se faltar, peça o extrato/planilha ao operador.
2. PROJEÇÃO 13 semanas em tabela: semana · entradas · saídas · saldo acumulado. Separe custo FIXO de variável. Marque as semanas de saldo negativo.
3. Para cada semana negativa, proponha a ação concreta: antecipar recebível, renegociar prazo com fornecedor, cortar variável específico — nunca «reduzir custos» genérico.
4. RÉGUA de cobrança em 4 toques, mensagens prontas: D-3 (lembrete cordial), D0 (vencimento, objetivo), D+3 (firme, com novo prazo), D+10 (renegociação com opções). Cordial e consistente — cobrar é profissional.
5. MARGEM: por produto/serviço, com ponto de equilíbrio. Faturamento alto com margem negativa é prejuízo acelerado — diga isso com o número.
6. Emita com `emitirArtefato` (`kind: documento`). Feche sempre com «os 3 números que importam esta semana».
7. Na resposta de chat, só RESUMA — e lembre: isto organiza e diagnostica; valide o fiscal/contábil com o contador.
