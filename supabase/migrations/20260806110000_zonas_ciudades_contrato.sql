-- =====================================================================
-- Alinea el catálogo con el contrato de HANDOFF §2.1 y añade la ciudad.
--
-- Dos cosas distintas:
--   1. Los códigos de zona pasan a los del contrato (mercedes, rosal, ...).
--   2. Aparece la ciudad del lead, que hasta ahora no se guardaba en
--      ninguna parte y es la única señal de dónde abrir la siguiente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ARRAIGO: el enum pasa a hablar el idioma del contrato
--
-- Se renombran las etiquetas en vez de traducir en el servidor. Un mapa
-- código→enum es una pieza más que puede desincronizarse, y aquí no hace
-- falta: el enum es nuestro y no lo lee nadie de fuera.
-- ---------------------------------------------------------------------

alter type rootedness_t rename value 'returnee'  to 'volvio';
alter type rootedness_t rename value 'stayed'    to 'se-quedo';
alter type rootedness_t rename value 'relocated' to 'interior';
alter type rootedness_t rename value 'foreigner' to 'extranjero';
alter type rootedness_t rename value 'visiting'  to 'visita';

-- La vista comparaba contra 'visiting'. Se recrea con el código nuevo.
create or replace view v_second_attendance as
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
       (p.rootedness = 'visita') as is_transient,
       s.first_at,
       s.second_at,
       (s.second_at is not null and s.second_at <= s.first_at + interval '60 days')
         as returned_60d
from seconds s
join profiles p on p.id = s.profile_id;


-- ---------------------------------------------------------------------
-- 2. ZONAS: códigos del contrato y el orden del cuestionario
-- ---------------------------------------------------------------------

-- Las claves foráneas apuntan al slug, así que se actualizan en cascada
-- explícita antes de tocar el catálogo.
alter table restaurants drop constraint if exists restaurants_zone_slug_fkey;
alter table events      drop constraint if exists events_zone_slug_fkey;

with nuevos(viejo, nuevo, orden) as (values
  ('las_mercedes',      'mercedes',      10),
  ('el_rosal',          'rosal',         20),
  ('bello_monte',       'bello-monte',   30),
  ('chacao',            'chacao',        40),
  ('altamira',          'altamira',      50),
  ('la_castellana',     'castellana',    60),
  ('los_palos_grandes', 'palos-grandes', 70),
  ('sebucan',           'sebucan',       80),
  ('chuao',             'chuao',         90),
  ('el_cafetal',        'cafetal',      100),
  ('los_naranjos',      'naranjos',     110),
  ('la_trinidad',       'trinidad',     120),
  ('el_hatillo',        'hatillo',      130)
)
update zones z set slug = n.nuevo, sort_order = n.orden
from nuevos n where z.slug = n.viejo;

update restaurants r set zone_slug = z.slug from zones z where r.zone_slug = z.slug;
update events e      set zone_slug = z.slug from zones z where e.zone_slug = z.slug;

alter table restaurants add constraint restaurants_zone_slug_fkey
  foreign key (zone_slug) references zones(slug) on update cascade;
alter table events add constraint events_zone_slug_fkey
  foreign key (zone_slug) references zones(slug) on update cascade;


-- ---------------------------------------------------------------------
-- 3. CIUDADES
--
-- Catálogo propio y no una columna de texto libre, porque el contador por
-- ciudad decide dónde se abre la siguiente: si cada lead escribe la ciudad
-- a su manera, ese número no sirve.
-- ---------------------------------------------------------------------

create table cities (
  slug       text primary key,
  name       text not null,
  is_open    boolean not null default false,  -- si ya operamos ahí
  sort_order int not null default 0
);

insert into cities (slug, name, is_open, sort_order) values
  ('caracas',        'Caracas',        true,  10),
  ('valencia',       'Valencia',       false, 20),
  ('maracaibo',      'Maracaibo',      false, 30),
  ('margarita',      'Margarita',      false, 40),
  ('barquisimeto',   'Barquisimeto',   false, 50),
  ('merida',         'Mérida',         false, 60),
  ('puerto-la-cruz', 'Puerto La Cruz', false, 70),
  ('otra',           'Otra ciudad',    false, 80);

alter table cities enable row level security;
create policy cities_read on cities for select using (true);


-- ---------------------------------------------------------------------
-- 4. LEAD: ciudad, días y el resto del contrato
-- ---------------------------------------------------------------------

-- `city` ya existía del esquema inicial, como texto libre con 'Caracas' por
-- defecto. Se normaliza al código del contrato y se ata al catálogo.
update waitlist set city = 'caracas'
where city is null or lower(btrim(city)) in ('caracas', '');

update waitlist w set city = c.slug
from cities c where lower(btrim(w.city)) = lower(c.name);

-- Cualquier valor que no cuadre con el catálogo cae en 'otra' antes de
-- poner la clave foránea: es preferible a perder el lead.
update waitlist set city = 'otra'
where city not in (select slug from cities);

alter table waitlist
  alter column city set default 'caracas',
  alter column city set not null,
  add constraint waitlist_city_fkey foreign key (city) references cities(slug),
  -- Cuarta pregunta de la landing. Antes se guardaba 'formats', que ya no
  -- se pregunta ahí: los planes pasaron al cuestionario.
  add column days text[] not null default '{}';

alter table waitlist drop column formats;

create index on waitlist (city);
create index waitlist_days_gin on waitlist using gin (days);

comment on column waitlist.city is
  'Codigo de ciudad del contrato. Un lead con ciudad marcada y cero zonas de '
  'Caracas es "de fuera": no pasa por el cuestionario, va a su cierre propio. '
  'Obligarlo a marcar una zona de Caracas contaminaria la densidad por zona.';


-- ---------------------------------------------------------------------
-- 5. DEMANDA POR CIUDAD, para el panel de operación
-- ---------------------------------------------------------------------

create or replace view v_city_demand as
select c.slug,
       c.name,
       c.is_open,
       count(w.id)::int as leads,
       count(w.id) filter (where w.quiz_completed_at is not null)::int as con_quiz,
       count(w.id) filter (where w.created_at > now() - interval '7 days')::int as ultimos_7d,
       max(w.created_at) as ultimo_lead
from cities c
left join waitlist w on w.city = c.slug
group by c.slug, c.name, c.is_open, c.sort_order
order by count(w.id) desc, c.sort_order;

comment on view v_city_demand is
  'Contador de leads por ciudad. Es la unica fuente de demanda por ciudad que '
  'existe y decide donde se abre la siguiente.';
