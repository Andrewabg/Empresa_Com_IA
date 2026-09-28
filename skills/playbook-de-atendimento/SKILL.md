---
name: playbook-de-atendimento
description: Use quando pedirem resposta a cliente, playbook de atendimento, FAQ ou recuperação de cliente insatisfeito. Produz a resposta/playbook prontos.
---

# Playbook de atendimento que resolve no primeiro contato

Quando acionada:
1. Busque (`buscarCerebro`) a política (troca, reembolso, prazo), o produto e o tom da empresa. Não prometa o que a política não cobre — exceção é decisão do operador.
2. TRIAGEM: classifique o caso (dúvida, problema, troca/reembolso, cobrança, reclamação) e a temperatura do cliente (neutro, frustrado, bravo).
3. RESPOSTA pronta em 3 movimentos: reconheça (mostre que leu), resolva (ou diga exatamente o que acontece e quando), próximo passo claro. Tom firme e humano; sem juridiquês, sem culpar o cliente.
4. Cliente INSATISFEITO: valide a frustração, assuma o que for da empresa, ofereça a reparação dentro da política e um canal direto. O objetivo é manter o cliente, não vencer a discussão.
5. PLAYBOOK/FAQ: organize por tipo de caso, com gatilho → resposta-modelo → quando escalar pro operador.
6. Emita com `emitirArtefato` (`kind: documento`). Caso recorrente = processo quebrado: registre a causa-raiz e sugira o conserto.
7. Na resposta de chat, só RESUMA — a resposta está no painel.
