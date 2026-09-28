---
name: distrato-rescisao
description: Use quando o operador precisar ENCERRAR um contrato existente (distrato com quitação).
---

# Distrato / Rescisão

Quando acionada:
1. Reúna: qual contrato está sendo encerrado (se estiver na Mesa/Cérebro, LEIA antes —
   as condições de rescisão de lá mandam), motivo, pendências financeiras de cada lado,
   data de corte.
2. Redija com `gerarContrato` (tipo `distrato`). Estrutura: Partes · Contrato encerrado
   (referência) · Data de encerramento · Acertos finais (valores devidos de cada lado) ·
   **Quitação mútua** (ampla, geral e irrestrita — ou ressalvas explícitas) · Sobrevivência
   (confidencialidade, não-concorrência se houver) · Foro.
3. Riscos típicos: quitação sem ressalvar pendência conhecida (você abre mão dela);
   esquecer cláusulas que SOBREVIVEM; encerrar sem formalizar devolução de materiais/acessos.
4. NÃO afirme validade jurídica; recomende revisão por advogado.
