-- 0086 — `onboarding_session.pergunta_em_jogo`: o topico que o ULTIMO turno perguntou de fato.
--
-- A diretiva manda o modelo fazer UMA pergunta especifica e as vezes ele parafraseia para
-- outro assunto. O dono responde ao que ouviu, mas quem manda no `topicId` gravado e o slot
-- da diretiva: o fato entra na Ficha com a etiqueta errada e vira "verdade da empresa" em
-- todo turno de todo agente. Esta coluna guarda o desvio detectado ao fim do turno para o
-- turno seguinte tratar o topico CERTO como em jogo.
--
-- Aditiva, nullable, sem default: container velho ignora a coluna e segue funcionando.
alter table onboarding_session
  add column if not exists pergunta_em_jogo text;
