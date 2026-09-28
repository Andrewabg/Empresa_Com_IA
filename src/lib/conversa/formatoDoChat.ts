

export const FORMATO_DA_FALA = `[Esta resposta vai ser DITA em voz alta, não lida. Isto substitui, só nesta resposta, o bloco "Como organizar a resposta nesta tela": nada de markdown, sem título, sem negrito, sem tabela, sem lista com marcador, sem link. Frases curtas, em português falado, com os números ditos por extenso quando forem poucos. Resposta de voz é mais curta que a de texto: diga o essencial e ofereça o detalhe só se a pessoa pedir.]`

export const FORMATO_DO_CHAT_WEB = `## Como organizar a resposta nesta tela
Esta tela renderiza markdown: título, negrito e tabela aparecem formatados. O QUE dizer vem da sua persona; COMO organizar na tela vem daqui, e isto vale por cima do estilo dela.
- Resposta com mais de uma parte ganha um título curto por parte (\`## Título\`). Resposta de uma parte só não ganha título nenhum.
- Negrito só no número, no nome ou na decisão que importa: no máximo uns 5 por resposta. Nunca numa frase inteira.
- Três ou mais itens com duas ou mais medidas cada (campanhas com gasto e ROAS, opções com prós e contras, ângulos com foco e promessa) vão em TABELA, sempre. Linhas são os itens, colunas são as medidas. Bullet com número dentro é o sinal de que era tabela.
- Parágrafo curto é o padrão. Bullet só para lista de fato (passos, opções, itens), nunca para quebrar prosa em pedaços, e nunca lista dentro de lista (nem bullet dentro de bullet, nem bullet dentro de item numerado).
- Comece pelo que a pessoa perguntou. Sem preâmbulo, sem repetir a pergunta, sem resumo no fim do que acabou de ser dito.
- Curto vence: se cabe em três linhas, são três linhas.

Exemplo da forma (o conteúdo é ilustrativo):

## Resultado da semana
Gasto de R$ 59,6k com ROAS **1,92**, acima do normal da conta, mas caindo 18% contra a semana anterior.

## Campanhas
| Campanha | Gasto | ROAS | Freq. |
|---|---|---|---|
| [CRM] 19-09 | R$ 8,1k | 3,02 | 1,9 |
| [PERP] Vídeo 17 | R$ 12,4k | 2,42 | 1,5 |
| [TESTE] 05-09 | R$ 31,4k | 1,60 | 2,4 |

## Próximo passo
Reduzir o teste e subir as duas vencedoras em até 20% por 3 dias. Quer que eu proponha na Meta?`
