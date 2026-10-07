alter table nexo_private.api_limits drop constraint api_limits_scope_check;
alter table nexo_private.api_limits add constraint api_limits_scope_check check (scope in ('state','register','play','answer','report'));
create or replace function public.nexo_allow_request(p_player uuid,p_scope text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  minute_start timestamptz := date_trunc('minute',now());
  request_count integer;
  maximum integer;
begin
  if current_user <> 'service_role' then raise exception 'Acceso denegado.'; end if;
  maximum := case p_scope when 'state' then 60 when 'register' then 5 when 'play' then 30 when 'answer' then 10 when 'report' then 3 else 0 end;
  if maximum=0 or p_player is null then return false; end if;
  insert into nexo_private.api_limits(player_id,scope,window_start,hits)
  values(p_player,p_scope,minute_start,1)
  on conflict(player_id,scope) do update set
    hits=case when api_limits.window_start=minute_start then least(api_limits.hits+1,maximum+1) else 1 end,
    window_start=minute_start
  returning hits into request_count;
  return request_count <= maximum;
end;
$$;
revoke all on function public.nexo_allow_request(uuid,text) from public,anon,authenticated;
grant execute on function public.nexo_allow_request(uuid,text) to service_role;
