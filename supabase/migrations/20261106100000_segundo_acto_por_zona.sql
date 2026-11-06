-- El segundo acto es de una zona, no de una fecha entera.
--
-- Michael, 06-11: «un segundo acto es un bar para restaurantes cercanos de una
-- zona, no es para todas las mesas de todas las zonas de esa fecha». Hasta hoy
-- `events.after_venue_id` guardaba un bar por fecha, así que una fecha repartida
-- en Chacao y Los Palos Grandes mandaba a las dos al mismo bar, y quien cenaba
-- lejos se quedaba además sin sus bares cercanos.
--
-- Y son dos papeles distintos. `is_after_venue` («Bares cercanos») es un sitio
-- para seguir que cada restaurante ofrece por su cuenta; `es_segundo_acto` es un
-- bar al que puede ir la zona entera, con su reserva. Un local puede ser las dos
-- cosas, y hasta hoy la primera marca hacía de las dos.

alter table restaurants
  add column if not exists es_segundo_acto boolean not null default false;

create table if not exists event_second_acts (
  event_id uuid not null references events(id) on delete cascade,
  zone_slug text not null references zones(slug),
  bar_id uuid not null references restaurants(id),
  created_at timestamptz not null default now(),
  -- Un bar por zona y fecha: la zona entera sigue en el mismo sitio.
  primary key (event_id, zone_slug)
);

alter table event_second_acts enable row level security;

-- Lo que ya había. Cada bar pasa a la zona en la que está, y los que se han usado
-- quedan marcados como de segundo acto.
update restaurants set es_segundo_acto = true
  where id in (select after_venue_id from events where after_venue_id is not null);

insert into event_second_acts (event_id, zone_slug, bar_id)
  select e.id, r.zone_slug, e.after_venue_id
  from events e
  join restaurants r on r.id = e.after_venue_id
  where r.zone_slug is not null
on conflict do nothing;

comment on column events.after_venue_id is
  'Retirada el 06-11-2026: ya nadie la lee ni la escribe. El bar vive en event_second_acts, por zona.';
