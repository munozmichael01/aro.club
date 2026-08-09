-- =====================================================================
-- Entrega 7 · El arraigo cambia de forma, y la ciudad deja de ser una
-- constante.
--
-- ARRAIGO
--   `extranjero` se fusiona en `interior`. Design cuenta que en su codigo
--   la fusion estaba dentro del branch equivocado y esos perfiles no
--   resolvian: el arraigo se perdia en silencio. Aqui hay uno de verdad.
--
--   Y entran dos codigos nuevos, `mismos` y `remoto`, que no exigen haber
--   emigrado. El requisito anterior sesgaba el producto hacia los treinta
--   y muchos: alguien de veinticinco que sigue con la gente del colegio
--   tiene exactamente el mismo problema y no se veia en ninguna opcion.
--
--   Postgres no deja quitar un valor de un enum, asi que se construye el
--   tipo nuevo y se cambian las columnas. Es mas trabajo que dejar
--   `extranjero` huerfano, pero un valor que no se puede elegir y que
--   sigue siendo valido es una trampa para el codigo de dentro de un mes.
--
-- CIUDAD
--   El copy sigue diciendo Caracas, pero deja de estar clavado. Las zonas
--   pasan a pertenecer a una ciudad, y el lead, el perfil y la fecha
--   guardan cual. El dia que abra Valencia, el valenciano lee «Valencia».
-- =====================================================================

-- --- arraigo ---------------------------------------------------------
-- Postgres no deja cambiar el tipo de una columna que use una vista, asi
-- que las dos que leen el arraigo se tiran y se vuelven a crear igual.
drop view if exists v_matching_pool;
drop view if exists v_second_attendance;

create type rootedness_nuevo_t as enum (
  'volvio', 'se-quedo', 'interior', 'visita', 'mismos', 'remoto'
);

-- La fusion ANTES de cambiar el tipo: si se hace despues, estos valores
-- ya no tienen donde caer.
update waitlist       set rootedness = 'interior' where rootedness = 'extranjero';
update profiles       set rootedness = 'interior' where rootedness = 'extranjero';
update profile_traits set rootedness = 'interior' where rootedness = 'extranjero';

alter table waitlist
  alter column rootedness type rootedness_nuevo_t using rootedness::text::rootedness_nuevo_t;
alter table profiles
  alter column rootedness type rootedness_nuevo_t using rootedness::text::rootedness_nuevo_t;
alter table profile_traits
  alter column rootedness type rootedness_nuevo_t using rootedness::text::rootedness_nuevo_t;

drop type rootedness_t;
alter type rootedness_nuevo_t rename to rootedness_t;

-- --- ciudad ----------------------------------------------------------
alter table zones
  add column if not exists city_slug text references cities(slug);

update zones set city_slug = 'caracas' where city_slug is null;
alter table zones alter column city_slug set not null;

create index if not exists zones_por_ciudad on zones (city_slug, sort_order);

alter table profiles
  add column if not exists city_slug text references cities(slug);

-- waitlist.city y events.city eran texto libre con 'Caracas' por defecto.
-- Pasan a apuntar al catalogo: una ciudad escrita a mano no se puede
-- cruzar con sus zonas.
alter table waitlist add column if not exists city_slug text references cities(slug);
update waitlist set city_slug = lower(coalesce(city, 'caracas')) where city_slug is null;
update waitlist set city_slug = 'caracas' where city_slug not in (select slug from cities);

alter table events add column if not exists city_slug text references cities(slug);
update events set city_slug = lower(coalesce(city, 'caracas')) where city_slug is null;
update events set city_slug = 'caracas' where city_slug not in (select slug from cities);
alter table events alter column city_slug set not null;

-- El perfil hereda la del lead al convertirse.
update profiles p
   set city_slug = w.city_slug
  from waitlist w
 where w.converted_profile_id = p.id and p.city_slug is null;

update profiles set city_slug = 'caracas' where city_slug is null;

comment on column events.city is
  'OBSOLETO: texto libre. La ciudad de verdad es city_slug.';
comment on column waitlist.city is
  'OBSOLETO: texto libre. La ciudad de verdad es city_slug.';

-- Las dos vistas, tal cual estaban.
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
