
alter table public.painel_blocos drop constraint painel_blocos_type_check;
alter table public.painel_blocos add constraint painel_blocos_type_check
  check (type in ('kpi','timeseries','table','funnel','comparison',
    'creatives','audiences','goals','health','recommendation','note','drilldown'));
