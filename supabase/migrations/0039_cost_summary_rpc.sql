











create or replace function public.cost_summary(p_start timestamptz, p_end timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total', coalesce((
      select sum(amount_usd) from cost_events
      where created_at >= p_start and created_at < p_end
    ), 0),
    'by_day', coalesce((
      select jsonb_agg(jsonb_build_object('date', d, 'usd', s) order by d)
      from (
        select to_char(created_at at time zone 'UTC', 'YYYY-MM-DD') as d,
               sum(amount_usd) as s
        from cost_events
        where created_at >= p_start and created_at < p_end
        group by 1
      ) t
    ), '[]'::jsonb),
    'by_agent', coalesce((
      select jsonb_agg(jsonb_build_object('agent', agent, 'usd', s) order by s desc)
      from (
        select agent, sum(amount_usd) as s
        from cost_events
        where created_at >= p_start and created_at < p_end and agent is not null
        group by agent
      ) t
    ), '[]'::jsonb),
    'by_tool', coalesce((
      select jsonb_agg(jsonb_build_object('tool', tool, 'usd', s) order by s desc)
      from (
        select tool, sum(amount_usd) as s
        from cost_events
        where created_at >= p_start and created_at < p_end and tool is not null
        group by tool
      ) t
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.cost_summary(timestamptz, timestamptz) from public;
grant execute on function public.cost_summary(timestamptz, timestamptz) to service_role;
