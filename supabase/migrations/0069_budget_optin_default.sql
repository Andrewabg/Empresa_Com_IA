-- Orçamento opt-in: reseta o teto padrão de US$ 50 para 0 (= sem limite).
-- O limite mensal passa a ser configurável no painel (Config -> Custo); em branco
-- ou 0 = sem limite (a empresa nao pausa por custo). So toca a linha ainda no valor
-- de seed ('50') -- quem ja definiu um teto proprio nao e alterado.
update public.settings
  set value = '0', updated_at = now()
  where key = 'budget_usd' and value = '50';
