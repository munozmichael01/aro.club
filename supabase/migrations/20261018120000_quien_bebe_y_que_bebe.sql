-- Quien bebe en la cena, y que bebe.
--
-- Michael, 18-10: «debemos preguntar gustos en cuanto a bebidas, tanto de
-- tipo como nivel. El tema es que quiero saber quienes beberan en la cena y
-- quienes no. Y de los que beben, que beben. Esto es clave al menos en
-- caracas».
--
-- Son DOS preguntas porque son dos datos distintos y se usan para dos cosas
-- distintas:
--
--   - `copas` (nivel) dice si esa persona va a tomar. Es lo que operacion
--     necesita saber ANTES de llamar al local: una mesa de seis donde cuatro
--     no toman no se reserva igual que una donde los seis piden botella, y
--     hoy eso se descubre en la mesa.
--   - `bebidas` (tipo) dice que toma quien toma. Sirve para elegir sitio: en
--     Caracas la carta de vinos de un sitio y la de otro no se parecen, y el
--     ron bueno no esta en todas partes.
--
-- Las dos son OPCIONALES a proposito. Una pregunta obligatoria nueva deja
-- «incompleto» el cuestionario de las 574 fichas que ya estan contestadas
-- —`preguntasQueFaltan` cuenta las obligatorias del catalogo— y eso les
-- cierra el paso de reservar por una pregunta que no existia cuando
-- contestaron. Quien ya esta dentro la contesta desde Mi perfil, que lee el
-- mismo catalogo.
--
-- Lo que NO hacen: no puntuan y no son regla dura. Es la misma decision que
-- Michael tomo con las dietas el 17-10: se listan para que operacion elija
-- sitio con criterio y se le digan al restaurante, no para sentar a nadie.
-- Si con unas cuantas cenas resulta que una mesa seca y una mesa de botella
-- no se llevan, se mete en la puntuacion con datos y no con una teoria.

-- --- el dato en los rasgos -------------------------------------------
alter table profile_traits
  add column if not exists drinks text[] not null default '{}';

alter table profile_traits
  add column if not exists drink_level text;

comment on column profile_traits.drinks is
  'Que toma, en codigos estables: vino, cerveza, ron, whisky, ginebra, '
  'tequila, cocteles, sin-alcohol. Hasta tres. Sirve para elegir el sitio, '
  'no para sentar a nadie.';

comment on column profile_traits.drink_level is
  'Si va a tomar y cuanto: nada, una, algunas, varias. `nada` es el dato que '
  'de verdad hacia falta: cuantos de la mesa no van a pedir alcohol.';

-- --- la funcion que arma los rasgos ---------------------------------
--
-- `profile_traits` es DERIVADA: se reconstruye entera desde `answers` cada
-- vez que alguien contesta, asi que una columna nueva sin tocar esta funcion
-- es una columna que se queda vacia para siempre.
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
  if not exists (select 1 from profiles where id = p_profile_id) then
    delete from profile_traits where profile_id = p_profile_id;
    return;
  end if;

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
    cuisines, drinks, drink_level,
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
    coalesce(a_texto(r->'bebidas'),      '{}'),
    nullif(r->>'copas', ''),
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
    drinks = excluded.drinks, drink_level = excluded.drink_level,
    budget_tier = excluded.budget_tier, languages = excluded.languages,
    zones = excluded.zones, availability = excluded.availability,
    computed_at = now();
end $$;

-- --- las dos preguntas, en el catalogo activo -----------------------
--
-- En la pantalla 4, que es la de la comida: planes, que pesa, comidas,
-- bebidas y el gasto. La pregunta del dinero se queda de ultima porque es la
-- que mas cuesta contestar.
--
-- `sort_order` entre comidas (125) y gasto (130). El orden no es cosmetico:
-- primero si tomas, despues que tomas, porque la segunda no tiene sentido
-- para quien contesto que no toma.
insert into questions (
  version_id, key, prompt, help_text, input_type, options,
  min_select, max_select, is_required, exclusive_value, screen, sort_order
)
select v.id, q.key, q.prompt, q.help_text, q.input_type, q.options,
       q.min_select, q.max_select, false, q.exclusive_value, 4, q.sort_order
from questionnaire_versions v,
(values
  (
    'copas',
    '¿Tomas alcohol cuando sales?',
    'Con esto elegimos el sitio y sabemos qué pedirle al restaurante. No se muestra en tu perfil ni lo ve nadie de tu mesa.',
    'single',
    '[{"value":"nada","label":"No tomo alcohol"},
      {"value":"una","label":"Una copa y acompaño"},
      {"value":"algunas","label":"Dos o tres, sin apuro"},
      {"value":"varias","label":"Lo que pida la mesa"}]'::jsonb,
    null::int, null::int, null::text, 127
  ),
  (
    'bebidas',
    '¿Y qué tomas?',
    'Hasta tres. En Caracas no todos los sitios tienen buena carta de todo, así que esto decide bastante.',
    'multi',
    '[{"value":"vino","label":"Vino"},
      {"value":"cerveza","label":"Cerveza"},
      {"value":"ron","label":"Ron"},
      {"value":"whisky","label":"Whisky"},
      {"value":"ginebra","label":"Ginebra"},
      {"value":"tequila","label":"Tequila o mezcal"},
      {"value":"cocteles","label":"Cócteles"},
      {"value":"sin-alcohol","label":"Sin alcohol"}]'::jsonb,
    null::int, 3, 'sin-alcohol', 128
  )
) as q(key, prompt, help_text, input_type, options, min_select, max_select, exclusive_value, sort_order)
where v.is_active
on conflict (version_id, key) do update set
  prompt = excluded.prompt,
  help_text = excluded.help_text,
  input_type = excluded.input_type,
  options = excluded.options,
  min_select = excluded.min_select,
  max_select = excluded.max_select,
  is_required = excluded.is_required,
  exclusive_value = excluded.exclusive_value,
  screen = excluded.screen,
  sort_order = excluded.sort_order;
