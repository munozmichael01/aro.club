-- =====================================================================
-- Un evento es una FECHA, no un restaurante.
--
-- Antes: events.restaurant_id y events.zone_slug, en singular. Una fecha
-- era un sitio. Con eso no se puede abrir dos zonas el mismo jueves.
--
-- Ahora: al crear la fecha se decide QUE ZONAS se abren y donde se cena en
-- cada una. Y varias filas por zona a proposito: si Las Mercedes da tres
-- mesas y Cardenal solo aguanta dos, se añade un segundo sitio sin tocar
-- el esquema. Es la misma leccion que la de las zonas de la reserva: lo
-- que hoy es uno mañana son varios, y el singular es la migracion que no
-- queremos hacer.
-- =====================================================================

create table if not exists event_venues (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id) on delete cascade,
  zone_slug     text not null references zones(slug),
  restaurant_id uuid not null references restaurants(id),
  -- Cuantas mesas caben aqui esa noche. Por defecto, las del restaurante.
  max_tables    int,
  created_at    timestamptz not null default now(),
  unique (event_id, restaurant_id)
);

create index if not exists event_venues_por_zona on event_venues (event_id, zone_slug);

-- ---------------------------------------------------------------------
-- Las zonas que la persona acepta PARA ESA FECHA.
--
-- Un conjunto, no un valor. Con selección única el pool se parte en tantos
-- trozos como zonas y con poca gente no se llena ninguna mesa. Ademas ya
-- preguntamos en el cuestionario a que zonas puede ir: pedirle que elija
-- una es tirar lo que ya nos dijo.
--
-- Se guarda por reserva y no por perfil porque una semana concreta puede
-- venirle bien otra cosa.
-- ---------------------------------------------------------------------
create table if not exists booking_zones (
  booking_id uuid not null references bookings(id) on delete cascade,
  zone_slug  text not null references zones(slug),
  primary key (booking_id, zone_slug)
);

alter table event_venues  enable row level security;
alter table booking_zones enable row level security;

create policy venues_lectura on event_venues
  for select using (true);

create policy zonas_propias on booking_zones
  for select using (
    exists (select 1 from bookings b
             where b.id = booking_zones.booking_id
               and (b.profile_id = auth.uid() or is_ops()))
  );

-- ---------------------------------------------------------------------
-- El pool lleva las zonas aceptadas. Si la reserva no dijo nada, valen las
-- del cuestionario: es lo que la persona ya declaro, y dejarla con el
-- conjunto vacio la sacaria del reparto por no haber contestado algo que
-- no le preguntamos.
-- ---------------------------------------------------------------------
drop view if exists v_matching_pool;
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

-- ---------------------------------------------------------------------
-- Las fechas que ya existen se traen su restaurante como unica sede, para
-- que nada quede sin sitio al cambiar el modelo.
-- ---------------------------------------------------------------------
insert into event_venues (event_id, zone_slug, restaurant_id)
select e.id, r.zone_slug, e.restaurant_id
from events e
join restaurants r on r.id = e.restaurant_id
where e.restaurant_id is not null and r.zone_slug is not null
on conflict (event_id, restaurant_id) do nothing;

comment on column events.restaurant_id is
  'OBSOLETO desde el modelo de zonas. El sitio vive en event_venues y en dinner_tables.';
