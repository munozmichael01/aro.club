-- =====================================================================
-- Nadie derivaba profile_traits.
--
-- convertir_lead escribia `profiles` y `answers` y ahi se acababa. Pero
-- v_matching_pool hace INNER JOIN contra profile_traits, asi que un
-- usuario real —que responde el cuestionario y crea su cuenta— quedaba
-- INVISIBLE para el reparto: podia reservar y no sentarse nunca.
--
-- No se noto porque los doce de prueba se sembraron escribiendo los
-- rasgos a mano. El unico camino que existia era el que no usa nadie.
--
-- Y de paso: social_energy_t seguia en ingles mientras el cuestionario
-- responde escucha/depende/lleva y el matcher compara con 'lleva'. Ese
-- termino de la puntuacion nunca valio otra cosa que cero.
-- =====================================================================

alter type social_energy_t rename value 'listener' to 'escucha';
alter type social_energy_t rename value 'balanced' to 'depende';
alter type social_energy_t rename value 'driver'   to 'lleva';


-- Las respuestas multi llegan como array jsonb; los rasgos son text[].
create or replace function a_texto(v jsonb) returns text[]
language sql immutable as $$
  select case
    when v is null or jsonb_typeof(v) <> 'array' then null
    else array(select jsonb_array_elements_text(v))
  end
$$;

-- ---------------------------------------------------------------------
-- Los rasgos son una PROYECCION de las respuestas, no un segundo sitio
-- donde vive el dato. Por eso se recalculan enteros cada vez: si alguien
-- edita una respuesta en Mi perfil, sus rasgos dejan de mentir sin que
-- nadie tenga que acordarse de sincronizarlos.
-- ---------------------------------------------------------------------
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
begin
  select id into v_version from questionnaire_versions where is_active limit 1;
  if v_version is null then return; end if;

  -- Todas las respuestas de la persona en un solo objeto.
  select coalesce(jsonb_object_agg(question_key, value), '{}'::jsonb)
    into r
  from answers
  where profile_id = p_profile_id and version_id = v_version;

  select birthdate, gender into v_perfil from profiles where id = p_profile_id;

  insert into profile_traits (
    profile_id, version_id, age, gender, rootedness, industry, employer,
    life_stage, social_energy, intention, romantic_openness, dining_focus,
    formats, interests, conversation_topics, dealbreakers, dietary,
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
    -- El tramo de gasto es lo unico que no viaja tal cual: la restriccion
    -- dura compara distancia entre tramos, y para eso hace falta un
    -- numero, no una etiqueta.
    case r->>'gasto'
      when 'hasta-20' then 1
      when '20-35'    then 2
      when '35-50'    then 3
      when 'mas-50'   then 4
    end,
    -- Español por defecto: sin idioma comun la mesa no es legal, y dejar
    -- el array vacio sacaria del reparto a quien no conteste.
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
    budget_tier = excluded.budget_tier, languages = excluded.languages,
    zones = excluded.zones, availability = excluded.availability,
    computed_at = now();
end $$;

-- ---------------------------------------------------------------------
-- Se recalculan solos. Colgarlo de `answers` y no de la conversion es lo
-- que hace que editar una respuesta manana siga funcionando sin que nadie
-- tenga que acordarse de llamar a nada.
-- ---------------------------------------------------------------------
create or replace function tocar_rasgos() returns trigger
language plpgsql as $$
begin
  perform refrescar_rasgos(coalesce(new.profile_id, old.profile_id));
  return coalesce(new, old);
end $$;

drop trigger if exists trg_rasgos on answers;
create trigger trg_rasgos
  after insert or update or delete on answers
  for each row execute function tocar_rasgos();

-- Los datos base (nacimiento y genero) no son respuestas: viven en el
-- perfil, y la edad sale de ahi.
create or replace function tocar_rasgos_perfil() returns trigger
language plpgsql as $$
begin
  if new.birthdate is distinct from old.birthdate
     or new.gender is distinct from old.gender then
    perform refrescar_rasgos(new.id);
  end if;
  return new;
end $$;

drop trigger if exists trg_rasgos_perfil on profiles;
create trigger trg_rasgos_perfil
  after update on profiles
  for each row execute function tocar_rasgos_perfil();

-- Y los que ya existen sin rasgos, que hoy son todos los usuarios reales.
do $$
declare p record;
begin
  for p in select id from profiles loop
    perform refrescar_rasgos(p.id);
  end loop;
end $$;
