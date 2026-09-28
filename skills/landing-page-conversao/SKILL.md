---
name: landing-page-conversao
description: Use quando pedirem uma landing page / página de captura. Produz HTML pronto para preview.
---

# Landing page de conversão

Quando acionada:
1. Busque (buscarCerebro) a oferta, público e tom da empresa.
2. Emita com `emitirArtefato` usando `kind: html` — um HTML único, self-contained
   (CSS inline no <style>, sem dependências externas), responsivo.
3. Estrutura: hero (headline + subhead + CTA) · prova/benefícios · CTA final.
4. Copy no tom da empresa; CTA claro. Sem JS que dependa de origem (roda em iframe sandbox).
5. Na resposta de chat, só RESUMA (a página está no painel, com preview ao vivo).
