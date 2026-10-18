-- Tres cosas de la misma conversacion del 18-10.
--
-- 1. La lista de bebidas se queda corta. Michael: «aqui agrega vodka y
--    otros». Entran vodka, espumosos y aperitivos. La sangria NO: se
--    entiende dentro de vino, y preguntarla aparte parte el dato en dos.
--
-- 2. La bebida entra en el emparejamiento. Michael: «esto debe tomarse en
--    cuenta en el emparejamiento tambien», y eligio que PUNTUE y no que sea
--    regla dura: con poca gente apuntada, una regla dura mas es una mesa
--    menos. Por eso `drink_level` sube a `v_matching_pool`, que es la vista
--    que alimenta el reparto. `drinks` no: lo que toma cada quien elige
--    sitio, no reparte.
--
-- 3. Y a quien reserva sin haber contestado las preguntas nuevas se le
--    preguntan en Mi cuenta, justo despues de reservar. Esta columna es lo
--    que impide que el aviso salga dos veces por la misma reserva.

-- --- 1 · vodka, espumosos y aperitivos -------------------------------
update questions
   set options = '[{"value":"vino","label":"Vino"},
                   {"value":"cerveza","label":"Cerveza"},
                   {"value":"ron","label":"Ron"},
                   {"value":"whisky","label":"Whisky"},
                   {"value":"vodka","label":"Vodka"},
                   {"value":"ginebra","label":"Ginebra"},
                   {"value":"tequila","label":"Tequila o mezcal"},
                   {"value":"cocteles","label":"Cócteles"},
                   {"value":"aperitivos","label":"Aperitivos o vermut"},
                   {"value":"espumoso","label":"Champaña o espumoso"},
                   {"value":"sin-alcohol","label":"Sin alcohol"}]'::jsonb
 where key = 'bebidas'
   and version_id in (select id from questionnaire_versions where is_active);

-- --- 2 · el nivel, al pool del reparto -------------------------------
create or replace view v_matching_pool as
select b.event_id, b.id as booking_id, p.id as profile_id,
       pt.age, pt.gender, pt.rootedness, pt.industry,
       coalesce(ea.canonical, pt.employer_normalized) as employer_key,
       pt.life_stage, pt.social_energy, pt.intention, pt.romantic_openness,
       pt.dining_focus, pt.budget_tier,
       pt.interests, pt.conversation_topics, pt.dealbreakers,
       pt.dietary, pt.languages,
       coalesce(
         (select array_agg(bz.zone_slug) from booking_zones bz where bz.booking_id = b.id),
         pt.zones
       ) as zones,
       -- Al final y no en su sitio logico: `create or replace view` solo
       -- deja AÑADIR columnas por el final. Meterla entre medias obliga a
       -- soltar la vista, y soltarla es tocar lo que cuelgue de ella.
       pt.drink_level
from bookings b
join profiles p on p.id = b.profile_id
join profile_traits pt on pt.profile_id = p.id
left join employer_aliases ea on ea.alias = pt.employer_normalized
join events e on e.id = b.event_id
where b.status = 'confirmed'
  and p.status = 'active'
  and p.deleted_at is null
  and (not coalesce(p.es_prueba, false) or coalesce(e.es_prueba, false))
  and exists (select 1 from v_verified_profiles vp where vp.id = p.id);

alter view v_matching_pool set (security_invoker = on);

-- --- 3 · el aviso de preguntas nuevas, una vez por reserva -----------
alter table bookings
  add column if not exists preguntas_avisadas_at timestamptz;

comment on column bookings.preguntas_avisadas_at is
  'Cuando se le enseño a esta persona el aviso de preguntas sin contestar, '
  'al reservar. Vive en la reserva y no en el perfil a proposito: el aviso '
  'es «te faltan preguntas para ESTA mesa», asi que la siguiente vez que '
  'reserve vuelve a salir si sigue sin contestarlas. Lo que decide que '
  'preguntas son es el catalogo contra sus respuestas, asi que una pregunta '
  'que añadamos manana entra sola.';
