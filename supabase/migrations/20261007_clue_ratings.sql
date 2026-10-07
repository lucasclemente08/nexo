create table nexo_private.ratings (
  contact_id uuid not null references nexo_private.contacts(id) on delete cascade,
  player_id uuid not null references auth.users(id) on delete cascade,
  version integer not null,
  score integer not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  primary key(contact_id,player_id,version)
);
create index rating_player on nexo_private.ratings(player_id);
alter table nexo_private.ratings enable row level security;
revoke all on nexo_private.ratings from public,anon,authenticated;
grant all on nexo_private.ratings to service_role;

create or replace function public.nexo_api(p_player uuid, p_action text, p_data jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  d date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  cfg nexo_private.settings%rowtype;
  prog public.player_progress%rowtype;
  c nexo_private.contacts%rowtype;
  secret_word text;
  word_input text;
  clue_input text;
  contact_id uuid;
  v_request_id uuid;
  hits integer;
  result jsonb := '{}';
  previous jsonb;
  own_contacts jsonb;
  pool jsonb;
  rating_queue jsonb;
begin
  if current_user <> 'service_role' then raise exception 'Acceso denegado.'; end if;
  -- Auth is verified by the Edge Function; the progress FK enforces user existence.
  if p_player is null then
    raise exception 'Sesión inválida.';
  end if;
  -- One short transaction lock avoids cross-player deadlocks when crediting a creator.
  perform pg_advisory_xact_lock(hashtextextended('nexo:' || d::text,0));
  select * into cfg from nexo_private.settings where id;
  if not exists(select 1 from nexo_private.days where day=d) then
    insert into nexo_private.days(day,secret)
    select d,word from nexo_private.words order by gen_random_uuid() limit 1
    on conflict(day) do nothing;
  end if;
  select secret into secret_word from nexo_private.days where day=d;
  insert into public.player_progress(player_id,day,prefix,credits)
  values(p_player,d,left(secret_word,1),cfg.initial_credits) on conflict do nothing;
  select * into prog from public.player_progress where player_id=p_player and day=d for update;
  if p_action <> 'state' then
    v_request_id := (p_data->>'requestId')::uuid;
    if v_request_id is null then raise exception 'Falta identificador de operación.'; end if;
    select response into previous from nexo_private.requests where player_id=p_player and request_id=v_request_id;
    if previous is not null then return previous; end if;
    if (select count(*) from nexo_private.requests where player_id=p_player and created_at > now()-interval '1 minute') >= 30 then
      raise exception 'Esperá un minuto antes de continuar.';
    end if;
    if prog.status <> 'PLAYING' and p_action <> 'rate' then raise exception 'La partida del día ya terminó.'; end if;
  end if;

  if p_action='create' then
    word_input := nexo_private.normalize_word(p_data->>'word');
    clue_input := trim(p_data->>'clue');
    if word_input is null or word_input !~ '^[A-ZÑ]{2,40}$' or not starts_with(word_input,prog.prefix) then
      raise exception 'La palabra debe comenzar con todo el prefijo actual y contener solo letras.';
    end if;
    -- Never distinguish the secret from another valid submitted word.
    if clue_input is null or length(clue_input) not between 8 and 300 then raise exception 'La pista debe tener entre 8 y 300 caracteres.'; end if;
    if position(word_input in nexo_private.normalize_word(clue_input)) > 0 then raise exception 'La pista no puede incluir la respuesta.'; end if;
    if prog.credits < cfg.publish_cost then raise exception 'Necesitás ayudar a otro jugador para obtener créditos.'; end if;
    if exists(select 1 from nexo_private.contacts where creator=p_player and day=d and prefix=prog.prefix and status='PENDING') then
      raise exception 'Ya tenés una pista pendiente para este prefijo. Podés mejorarla.';
    end if;
    insert into nexo_private.contacts(day,creator,prefix,word,clue,required)
    values(d,p_player,prog.prefix,word_input,clue_input,cfg.confirmations);
    update public.player_progress set credits=credits-cfg.publish_cost where player_id=p_player and day=d;
    result:=jsonb_build_object('message','Tu pista ya está en el pool. Esperá las coincidencias de otros jugadores.');
  elsif p_action in ('answer','edit','report','rate') then
    contact_id:=(p_data->>'contactId')::uuid;
    select * into c from nexo_private.contacts where id=contact_id and day=d for update;
    if not found then raise exception 'Esta pista ya no está disponible.'; end if;
    if p_action='answer' then
      if c.creator=p_player then raise exception 'No podés validar tu propia pista.'; end if;
      if c.status='SUSPENDED' or not starts_with(c.word,prog.prefix) then raise exception 'Esta pista ya no es compatible con tu progreso.'; end if;
      if (p_data->>'version')::integer is distinct from c.version then raise exception 'La pista cambió. Actualizá antes de responder.'; end if;
      if exists(select 1 from nexo_private.answers where answers.contact_id=c.id and player_id=p_player) then raise exception 'Ya respondiste esta pista.'; end if;
      word_input:=nexo_private.normalize_word(p_data->>'guess');
      if word_input is null or word_input !~ '^[A-ZÑ]{2,40}$' or not starts_with(word_input,prog.prefix) then raise exception 'La respuesta debe comenzar con tu prefijo actual.'; end if;
      insert into nexo_private.answers(contact_id,player_id,version,guess,correct) values(c.id,p_player,c.version,word_input,word_input=c.word);
      update public.player_progress set credits=credits+cfg.answer_reward where player_id=p_player and day=d;
      select count(*) into hits from nexo_private.answers where answers.contact_id=c.id and version=c.version and correct;
      if hits>=c.required and not c.awarded then
        update nexo_private.contacts set status='CONFIRMED',awarded=true where id=c.id;
        -- The final letter finishes the game; no length is returned while playing.
        update public.player_progress set prefix=left(secret_word,length(prefix)+1),contacts=contacts+1,
          status=case when length(prefix)+1>=length(secret_word) then 'WON' else 'PLAYING' end,
          finished_at=case when length(prefix)+1>=length(secret_word) then now() else null end
        where player_id=c.creator and day=d and status='PLAYING' and prefix=c.prefix;
      end if;
      result:=jsonb_build_object('correct',word_input=c.word,'message',case when word_input=c.word then '¡CONTACTO! Sumaste un crédito por ayudar.' else 'No hubo contacto. Sumaste un crédito por participar.' end);
    elsif p_action='rate' then
      if c.creator=p_player then raise exception 'No podés valorar tu propia pista.'; end if;
      if c.status='SUSPENDED' or (p_data->>'version')::integer is distinct from c.version then raise exception 'La pista cambió o ya no está disponible.'; end if;
      if not exists(select 1 from nexo_private.answers a where a.contact_id=c.id and a.player_id=p_player and a.version=c.version) then raise exception 'Respondé la pista antes de valorarla.'; end if;
      if jsonb_typeof(p_data->'score') is distinct from 'number' or (p_data->>'score') !~ '^[1-5]$' then raise exception 'Elegí una valoración de 1 a 5 estrellas.'; end if;
      if exists(select 1 from nexo_private.ratings r where r.contact_id=c.id and r.player_id=p_player and r.version=c.version) then raise exception 'Ya valoraste esta pista.'; end if;
      insert into nexo_private.ratings(contact_id,player_id,version,score) values(c.id,p_player,c.version,(p_data->>'score')::integer);
      result:=jsonb_build_object('message','Gracias. Tu valoración de claridad ayuda a mejorar las pistas.');
    elsif p_action='edit' then
      if c.creator<>p_player or c.status<>'PENDING' then raise exception 'Solo podés editar tus pistas pendientes.'; end if;
      clue_input:=trim(p_data->>'clue');
      if clue_input is null or length(clue_input) not between 8 and 300 or position(c.word in nexo_private.normalize_word(clue_input))>0 then raise exception 'Escribí una pista de 8 a 300 caracteres sin incluir la respuesta.'; end if;
      update nexo_private.contacts set clue=clue_input,version=version+1 where id=c.id;
      result:=jsonb_build_object('message','Pista actualizada. Ahora necesita nuevas coincidencias.');
    else
      if c.creator=p_player then raise exception 'No podés reportar tu propia pista.'; end if;
      if not starts_with(c.word,prog.prefix) then raise exception 'Esta pista no está disponible para vos.'; end if;
      insert into nexo_private.reports(contact_id,player_id,reason) values(c.id,p_player,p_data->>'reason') on conflict do nothing;
      if (select count(*) from nexo_private.reports where reports.contact_id=c.id)>=cfg.report_threshold then
        update nexo_private.contacts set status='SUSPENDED' where id=c.id;
      end if;
      result:=jsonb_build_object('message','Reporte recibido. La pista se ocultó para vos.');
    end if;
  elsif p_action='guess' then
    word_input:=nexo_private.normalize_word(p_data->>'guess');
    if word_input is null or word_input !~ '^[A-ZÑ]{2,40}$' or not starts_with(word_input,prog.prefix) then raise exception 'El NEXO debe comenzar con tu prefijo actual.'; end if;
    update public.player_progress set attempts=array_append(attempts,word_input),
      status=case when word_input=secret_word then 'WON' when cardinality(attempts)+1>=cfg.max_attempts then 'LOST' else 'PLAYING' end,
      finished_at=case when word_input=secret_word or cardinality(attempts)+1>=cfg.max_attempts then now() else null end
    where player_id=p_player and day=d;
    result:=jsonb_build_object('correct',word_input=secret_word,'message',case when word_input=secret_word then '🎯 ¡NEXO RESUELTO!' else 'No es el NEXO.' end);
  elsif p_action<>'state' then
    raise exception 'Operación desconocida.';
  end if;

  select * into prog from public.player_progress where player_id=p_player and day=d;
  select coalesce(jsonb_agg(items order by created_at),'[]') into own_contacts from (
    select c1.created_at,jsonb_build_object('id',c1.id,'prefix',c1.prefix,'word',c1.word,'clue',c1.clue,'status',c1.status,'required',c1.required,
      'matches',(select count(*) from nexo_private.answers a where a.contact_id=c1.id and a.version=c1.version and a.correct),
      'responses',(select count(*) from nexo_private.answers a where a.contact_id=c1.id and a.version=c1.version),
      'ratingCount',(select count(*) from nexo_private.ratings r where r.contact_id=c1.id and r.version=c1.version),
      'ratingAverage',(select round(avg(r.score),1) from nexo_private.ratings r where r.contact_id=c1.id and r.version=c1.version),
      'originality',round(100.0*(1-(select count(*)::numeric from nexo_private.contacts o where o.day=d and o.prefix=c1.prefix and o.word=c1.word)/greatest(1,(select count(*) from nexo_private.contacts o where o.day=d and o.prefix=c1.prefix))),1)) items
    from nexo_private.contacts c1 where c1.creator=p_player and c1.day=d
  ) own_rows;
  select coalesce(jsonb_agg(items),'[]') into pool from (
    select jsonb_build_object('id',c2.id,'prefix',prog.prefix,'clue',c2.clue,'version',c2.version) items
    from nexo_private.contacts c2 where c2.day=d and c2.creator<>p_player and c2.status<>'SUSPENDED' and starts_with(c2.word,prog.prefix)
      and not exists(select 1 from nexo_private.answers a where a.contact_id=c2.id and a.player_id=p_player)
      and not exists(select 1 from nexo_private.reports r where r.contact_id=c2.id and r.player_id=p_player)
    order by (c2.status='PENDING') desc,c2.created_at limit 10
  ) pool_rows;
  select coalesce(jsonb_agg(items),'[]') into rating_queue from (
    select jsonb_build_object('id',c3.id,'prefix',c3.prefix,'clue',c3.clue,'version',c3.version) items
    from nexo_private.answers a join nexo_private.contacts c3 on c3.id=a.contact_id
    where a.player_id=p_player and c3.day=d and c3.creator<>p_player and c3.status<>'SUSPENDED' and a.version=c3.version
      and not exists(select 1 from nexo_private.ratings r where r.contact_id=c3.id and r.player_id=p_player and r.version=c3.version)
    order by a.created_at desc limit 5
  ) rating_rows;
  result:=result || jsonb_build_object('day',d,'progress',to_jsonb(prog)-'player_id',
    'config',jsonb_build_object('confirmations',cfg.confirmations,'maxAttempts',cfg.max_attempts,'publishCost',cfg.publish_cost,'answerReward',cfg.answer_reward),
    'ownContacts',own_contacts,'pool',pool,'ratingQueue',rating_queue,
    'secret',case when prog.status in ('WON','LOST') then secret_word else null end);
  if p_action<>'state' then
    insert into nexo_private.requests(player_id,request_id,response) values(p_player,v_request_id,result);
  end if;
  return result;
end;
$$;
revoke all on function public.nexo_api(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.nexo_api(uuid,text,jsonb) to service_role;
