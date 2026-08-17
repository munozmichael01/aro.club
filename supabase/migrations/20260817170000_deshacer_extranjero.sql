-- Deshace lo que añadí hace una hora, que estaba mal.
--
-- Vi que el cuestionario mandaba `extranjero`, que la columna lo rechazaba, y
-- añadí el valor al enum. Leí el desajuste al revés.
--
-- La entrega 7 (`20260809180000_arraigo_y_ciudad.sql`) quitó `extranjero` A
-- PROPÓSITO: lo fusionó dentro de `interior` y reconstruyó el tipo entero para
-- que no se pudiera elegir. Su motivo, escrito allí: «un valor que no se puede
-- elegir y que sigue siendo válido es una trampa para el código de dentro de
-- un mes». Volver a añadirlo deshacía esa decisión y ponía la trampa otra vez.
--
-- Lo que de verdad estaba roto era la PANTALLA, que se quedó en la versión
-- anterior a esa entrega: ofrecía `extranjero` —retirado— y no ofrecía
-- `mismos` ni `remoto`, que la misma entrega añadió porque el requisito de
-- haber emigrado sesgaba el producto hacia los treinta y muchos. Eso ya está
-- arreglado en el cuestionario; esto devuelve el enum a como debía estar.
--
-- Se reconstruye el tipo igual que hizo la entrega 7, porque Postgres no deja
-- quitar un valor de un enum.

-- Las vistas que leen el arraigo bloquean el cambio de tipo, así que se tiran
-- y se recrean tal cual estaban.
drop view if exists v_matching_pool;
drop view if exists v_second_attendance;

create type rootedness_sin_extranjero_t as enum (
  'volvio', 'se-quedo', 'interior', 'visita', 'mismos', 'remoto'
);

-- La fusión antes del cambio de tipo: después estos valores no tendrían dónde
-- caer. Hoy no hay ninguno —el valor vivió una hora y nadie contestó en ese
-- rato— pero se deja escrito porque una migración no puede depender de eso.
update waitlist       set rootedness = 'interior' where rootedness::text = 'extranjero';
update profiles       set rootedness = 'interior' where rootedness::text = 'extranjero';
update profile_traits set rootedness = 'interior' where rootedness::text = 'extranjero';

alter table waitlist
  alter column rootedness type rootedness_sin_extranjero_t using rootedness::text::rootedness_sin_extranjero_t;
alter table profiles
  alter column rootedness type rootedness_sin_extranjero_t using rootedness::text::rootedness_sin_extranjero_t;
alter table profile_traits
  alter column rootedness type rootedness_sin_extranjero_t using rootedness::text::rootedness_sin_extranjero_t;

drop type rootedness_t;
alter type rootedness_sin_extranjero_t rename to rootedness_t;

-- Y las dos vistas de vuelta, copiadas de donde estaban: v_matching_pool de
-- `20260810180000_terminos_y_baja.sql`, que es su última versión, y
-- v_second_attendance de la propia entrega 7.
create view v_matching_pool as
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
       ) as zones
from bookings b
join profiles p on p.id = b.profile_id
join profile_traits pt on pt.profile_id = p.id
left join employer_aliases ea on ea.alias = pt.employer_normalized
where b.status = 'confirmed'
  and p.status = 'active'
  and p.deleted_at is null
  and exists (select 1 from v_verified_profiles vp where vp.id = p.id);
alter view v_matching_pool set (security_invoker = on);

create view v_second_attendance as
with firsts as (
  select b.profile_id, min(e.starts_at) as first_at
  from bookings b join events e on e.id = b.event_id
  where b.status = 'attended'
  group by b.profile_id
),
seconds as (
  select f.profile_id, f.first_at,
         min(e.starts_at) filter (where e.starts_at > f.first_at) as second_at
  from firsts f
  join bookings b on b.profile_id = f.profile_id and b.status = 'attended'
  join events e on e.id = b.event_id
  group by f.profile_id, f.first_at
)
select s.profile_id,
       p.rootedness,
       -- Quien vino de visita no vuelve a los 60 dias, y eso no es un
       -- fallo de retencion: es lo esperado. La metrica de titular tiene
       -- que poder excluirlos.
       (p.rootedness = 'visita') as is_transient,
       s.first_at,
       s.second_at,
       (s.second_at is not null and s.second_at <= s.first_at + interval '60 days')
         as returned_60d
from seconds s
join profiles p on p.id = s.profile_id;
