---
name: relatorio-executivo
description: Use quando pedirem leitura de números, relatório de desempenho ou definição de KPIs. Produz o relatório 1-página com decisões sugeridas.
---

# Relatório executivo de 1 página (número → decisão)

Quando acionada:
1. Comece pela PERGUNTA de negócio (o que o operador quer decidir?), não pela planilha. Peça o dado se faltar (colar números/tabela serve) e busque metas/histórico no Cérebro (`buscarCerebro`). Não invente dado.
2. VALIDE antes de analisar: período completo? comparável (mesma janela, mesma definição)? sazonalidade?
3. COMPARE ou nada: todo número contra baseline (o normal), meta e período anterior. Número solto é ruído.
4. ESTRUTURA do relatório (1 página): o número que importa → o contexto (vs baseline/meta) → a causa provável → 3 decisões sugeridas, da mais barata pra mais cara. KPI caiu? Decomponha (preço × volume × mix) antes de opinar.
5. Para DEFINIR KPIs: por área, tabela com definição · fonte · frequência · dono · meta. Cuidado com métrica de vaidade: se não muda decisão, sai.
6. Emita com `emitirArtefato` (`kind: documento`).
7. Na resposta de chat, só RESUMA — o relatório está no painel.
