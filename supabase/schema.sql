-- NEXO: private answers, service-only transactional API, own-progress Realtime.
create schema if not exists nexo_private;
revoke all on schema nexo_private from public, anon, authenticated;
grant usage on schema nexo_private to service_role;

create table nexo_private.settings (
  id boolean primary key default true check (id),
  confirmations integer not null default 2 check (confirmations between 1 and 10),
  max_attempts integer not null default 3 check (max_attempts between 1 and 20),
  initial_credits integer not null default 1 check (initial_credits >= 1),
  publish_cost integer not null default 1 check (publish_cost > 0),
  answer_reward integer not null default 1 check (answer_reward > 0),
  report_threshold integer not null default 3 check (report_threshold > 0)
);
insert into nexo_private.settings (id) values (true);
create table nexo_private.words (id bigint generated always as identity primary key, word text unique not null);
insert into nexo_private.words(word) values
('PUENTE'),('SOMBRA'),('VENTANA'),('CAMINO'),('BOSQUE'),('SEMILLA'),('HORIZONTE'),
('BRISA'),('DESTINO'),('REFUGIO'),('ESTRELLA'),('SILENCIO'),('CUADERNO'),('JARDIN'),
('ABRAZO'),('RELOJ'),('CASCADA'),('LINTERNA'),('TESORO'),('MARIPOSA'),('NUBE'),
('ORILLA'),('ESPEJO'),('RINCON'),('CAMPANA'),('ARENA'),('PALABRA'),('MEMORIA'),
('ISLA'),('INVIERNO'),('ALMENDRA'),('CARACOL');
create table nexo_private.days (day date primary key, secret text not null);
create table public.player_progress (
  player_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  prefix text not null,
  status text not null default 'PLAYING' check (status in ('PLAYING','WON','LOST')),
  credits integer not null check (credits >= 0),
  attempts text[] not null default '{}',
  contacts integer not null default 0,
  bonus_used boolean not null default false,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  primary key(player_id,day)
);
alter table public.player_progress enable row level security;
revoke all on public.player_progress from anon, authenticated;
grant select on public.player_progress to authenticated;
create policy own_progress on public.player_progress for select to authenticated
using ((select auth.uid()) = player_id);
alter publication supabase_realtime add table public.player_progress;

create table nexo_private.contacts (
  id uuid primary key default gen_random_uuid(),
  day date not null references nexo_private.days(day),
  creator uuid not null references auth.users(id) on delete cascade,
  prefix text not null,
  word text not null,
  clue text not null check (length(clue) between 8 and 300),
  version integer not null default 1,
  required integer not null,
  status text not null default 'PENDING' check (status in ('PENDING','CONFIRMED','SUSPENDED')),
  awarded boolean not null default false,
  created_at timestamptz not null default now()
);
create index contact_pool on nexo_private.contacts(day,prefix,status);
create index contact_owner on nexo_private.contacts(creator,day);
create table nexo_private.answers (
  contact_id uuid not null references nexo_private.contacts(id) on delete cascade,
  player_id uuid not null references auth.users(id) on delete cascade,
  version integer not null,
  guess text not null,
  correct boolean not null,
  created_at timestamptz not null default now(),
  primary key(contact_id,player_id)
);
create table nexo_private.reports (
  contact_id uuid not null references nexo_private.contacts(id) on delete cascade,
  player_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('fragment','spelling','translation','inappropriate','other')),
  primary key(contact_id,player_id)
);
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
create table nexo_private.requests (
  player_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key(player_id,request_id)
);
create index request_rate on nexo_private.requests(player_id,created_at);
alter table nexo_private.settings enable row level security;
alter table nexo_private.words enable row level security;
alter table nexo_private.days enable row level security;
alter table nexo_private.contacts enable row level security;
alter table nexo_private.answers enable row level security;
alter table nexo_private.reports enable row level security;
alter table nexo_private.requests enable row level security;
grant all on all tables in schema nexo_private to service_role;
grant all on all sequences in schema nexo_private to service_role;
grant all on public.player_progress to service_role;

create function nexo_private.normalize_word(value text) returns text
language sql immutable strict set search_path = '' as $$
  select translate(upper(normalize(trim(value), NFC)), 'ÁÉÍÓÚÜ', 'AEIOUU')
$$;

-- Deterministic quality check: no AI and no browser-provided eligibility.
create function nexo_private.good_clue(p_contact uuid) returns boolean
language sql stable security invoker set search_path = '' as $$
  select coalesce((select c.status='CONFIRMED'
    and length(trim(c.clue))>=12
    and cardinality(regexp_split_to_array(trim(c.clue), '\s+'))>=3
    and position(c.word in regexp_replace(nexo_private.normalize_word(c.clue),'[^A-ZÑ]','','g'))=0
    and (select count(*)>=3 and avg(r.score)>=4 from nexo_private.ratings r where r.contact_id=c.id and r.version=c.version)
    and (select count(*) filter(where a.correct)>=greatest(c.required,2) and avg(case when a.correct then 1.0 else 0.0 end)>=0.6
      from nexo_private.answers a where a.contact_id=c.id and a.version=c.version)
    from nexo_private.contacts c where c.id=p_contact),false)
$$;
revoke all on function nexo_private.good_clue(uuid) from public,anon,authenticated;
grant execute on function nexo_private.good_clue(uuid) to service_role;

-- Locks serialize each player's balance and each contact's confirmations.
-- Execute is revoked from all browser roles; only the authenticated Edge API calls this.
create function public.nexo_api(p_player uuid, p_action text, p_data jsonb default '{}')
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
    if previous is not null then
      if previous->'progress'->>'status' <> 'WON' then previous:=jsonb_set(previous,'{secret}','null'::jsonb); end if;
      return previous;
    end if;
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
  elsif p_action in ('answer','edit','report','rate','bonus') then
    contact_id:=(p_data->>'contactId')::uuid;
    select * into c from nexo_private.contacts where id=contact_id and day=d for update;
    if not found then raise exception 'Esta pista ya no está disponible.'; end if;
    if p_action='bonus' then
      if c.creator<>p_player then raise exception 'El bonus corresponde al autor de la pista.'; end if;
      if prog.bonus_used then raise exception 'Ya usaste tu bonus de hoy.'; end if;
      if not nexo_private.good_clue(c.id) then raise exception 'La pista todavía no cumple los requisitos del bonus.'; end if;
      update public.player_progress set bonus_used=true,prefix=left(secret_word,length(prefix)+1),
        status=case when length(prefix)+1>=length(secret_word) then 'WON' else 'PLAYING' end,
        finished_at=case when length(prefix)+1>=length(secret_word) then now() else null end
      where player_id=p_player and day=d;
      result:=jsonb_build_object('message','¡Bonus por buena pista! Descubriste una letra extra.');
    elsif p_action='answer' then
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
        where player_id=c.creator and day=d and status='PLAYING' and starts_with(prefix,c.prefix);
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
      'qualityEligible',nexo_private.good_clue(c1.id),
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
    'bonus',jsonb_build_object('used',prog.bonus_used,'available',prog.status='PLAYING' and not prog.bonus_used and exists(select 1 from nexo_private.contacts b where b.creator=p_player and b.day=d and nexo_private.good_clue(b.id))),
    'secret',case when prog.status='WON' then secret_word else null end);
  if p_action<>'state' then
    insert into nexo_private.requests(player_id,request_id,response) values(p_player,v_request_id,result);
  end if;
  return result;
end;
$$;
revoke all on function public.nexo_api(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.nexo_api(uuid,text,jsonb) to service_role;
revoke all on function nexo_private.normalize_word(text) from public,anon,authenticated;
grant execute on function nexo_private.normalize_word(text) to service_role;

-- Separate RPC transaction: failed game operations cannot roll back this limit.
create table nexo_private.api_limits (
  player_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('state','register','play','answer','report')),
  window_start timestamptz not null,
  hits integer not null check (hits > 0),
  primary key (player_id,scope)
);
alter table nexo_private.api_limits enable row level security;
revoke all on nexo_private.api_limits from public,anon,authenticated;
grant all on nexo_private.api_limits to service_role;
create function public.nexo_allow_request(p_player uuid,p_scope text)
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
