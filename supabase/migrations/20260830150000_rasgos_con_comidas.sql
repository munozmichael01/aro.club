-- Las comidas favoritas llegan a los rasgos.
--
-- La respuesta se guardaba en `answers` y ahi se quedaba: `profile_traits` es
-- lo que lee el reparto y lo que cruza el panel, y sin columna ahi el dato no
-- lo veia nadie. Una pregunta cuya respuesta no puede leer nadie es peor que
-- no preguntarla: se cobra el tiempo de quien contesta y no devuelve nada.
--
-- `profile_traits` es DERIVADA: se reconstruye entera desde `answers` cada vez
-- que alguien contesta. Por eso el cambio es la columna mas la funcion, y por
-- eso al final se refrescan las fichas que ya tenian la respuesta puesta.

alter table profile_traits
  add column if not exists cuisines text[] not null default '{}';

comment on column profile_traits.cuisines is
  'Las tres cocinas favoritas, en codigos estables. Sirve para elegir el '
  'restaurante de una fecha cruzando lo que pide la bolsa entera, no para '
  'sentar a nadie: seis personas casi nunca coinciden en positivo.';

create or replace function refrescar_rasgos(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version int;
  r         jsonb;
  v_perfil  record;
  v_baja    timestamptz;
begin
  -- Si el perfil ya no está, no hay rasgos que refrescar. Se comprueba la
  -- EXISTENCIA y no solo `deleted_at`: en una cascada de borrado la fila ya
  -- no se ve desde aquí, y `deleted_at` llega null igual que cualquier campo
  -- de una fila que no existe.
  if not exists (select 1 from profiles where id = p_profile_id) then
    delete from profile_traits where profile_id = p_profile_id;
    return;
  end if;

  -- Quien se dio de baja NO tiene rasgos, y no los recupera por un trigger.
  select deleted_at into v_baja from profiles where id = p_profile_id;
  if v_baja is not null then
    delete from profile_traits where profile_id = p_profile_id;
    return;
  end if;

  select id into v_version from questionnaire_versions where is_active limit 1;
  if v_version is null then return; end if;

  select coalesce(jsonb_object_agg(question_key, value), '{}'::jsonb)
    into r
  from answers
  where profile_id = p_profile_id and version_id = v_version;

  select birthdate, gender into v_perfil from profiles where id = p_profile_id;

  insert into profile_traits (
    profile_id, version_id, age, gender, rootedness, industry, employer,
    life_stage, social_energy, intention, romantic_openness, dining_focus,
    formats, interests, conversation_topics, dealbreakers, dietary,
    cuisines,
    budget_tier, languages, zones, availability, computed_at
  )
  values (
    p_profile_id,
    v_version,
    case when v_perfil.birthdate is null then null
         else extract(year from age(v_perfil.birthdate))::int end,
    v_perfil.gender,
    nullif(r->>'arraigo', '')::rootedness_t,
    nullif(r->>'sector', ''),
    nullif(r->>'empleador', ''),
    nullif(r->>'momento', ''),
    nullif(r->>'rol', '')::social_energy_t,
    nullif(r->>'motivo', ''),
    nullif(r->>'romance', ''),
    nullif(r->>'peso', ''),
    coalesce(a_texto(r->'planes'),       '{}'),
    coalesce(a_texto(r->'actividades'),  '{}'),
    coalesce(a_texto(r->'temas'),        '{}'),
    coalesce(a_texto(r->'evitar'),       '{}'),
    coalesce(a_texto(r->'dieta'),        '{}'),
    coalesce(a_texto(r->'comidas'),      '{}'),
    case r->>'gasto'
      when 'hasta-20' then 1
      when '20-35'    then 2
      when '35-50'    then 3
      when 'mas-50'   then 4
    end,
    coalesce(nullif(a_texto(r->'idiomas'), '{}'), '{es}'),
    coalesce(a_texto(r->'zonas'),  '{}'),
    coalesce(a_texto(r->'dias'),   '{}'),
    now()
  )
  on conflict (profile_id) do update set
    version_id = excluded.version_id,
    age = excluded.age, gender = excluded.gender,
    rootedness = excluded.rootedness, industry = excluded.industry,
    employer = excluded.employer, life_stage = excluded.life_stage,
    social_energy = excluded.social_energy, intention = excluded.intention,
    romantic_openness = excluded.romantic_openness,
    dining_focus = excluded.dining_focus, formats = excluded.formats,
    interests = excluded.interests,
    conversation_topics = excluded.conversation_topics,
    dealbreakers = excluded.dealbreakers, dietary = excluded.dietary,
    cuisines = excluded.cuisines,
    budget_tier = excluded.budget_tier, languages = excluded.languages,
    zones = excluded.zones, availability = excluded.availability,
    computed_at = now();
end $$;
