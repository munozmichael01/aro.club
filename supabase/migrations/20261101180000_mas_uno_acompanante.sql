-- «+1 acompañante»: fechas donde toda la mesa llega de dos en dos.
--
-- Diseño base: docs/entrega/DISENO-plan-mas-uno.md (25-10). Lo que cambió el
-- 01-11, decidido por Michael (app-mobile/Design/BRIEF-mas-uno-acompanante.md):
-- quien reserva paga los dos puestos y recibe un ENLACE, sin darnos ningún
-- dato; el acompañante hace el alta completa y se verifica como cualquiera;
-- el puesto es de la primera persona cuya verificación se aprueba; y si al
-- cierre no hay acompañante aprobado se cancelan los dos puestos con dos
-- créditos.

-- 1 · Una marca de la FECHA, como la banda de edad o el idioma. No un
-- formato nuevo: eso arrastraría familias, planes del cuestionario, horas
-- por formato y filtros de la agenda. Y compone: una fecha +1 puede ser +45.
--
-- `seats_per_table` sigue contando PERSONAS (seis), no reservas. Así todo lo
-- que ya dice «seis personas», avisa al local o detecta una mesa corta
-- sigue diciendo la verdad sin saber nada del +1.
alter table events add column if not exists mas_uno boolean not null default false;

comment on column events.mas_uno is
  'Fecha +1 acompañante: cada reserva son dos puestos (credit_cost 2, '
  'price_usd el doble) y la mesa se reparte de dos en dos.';

-- 2 · El acompañante tiene SU reserva, atada a la de quien le invitó.
--
-- Con reserva propia, todo lo que ya existe le sirve sin tocarlo: Mi mesa,
-- los recordatorios, la encuesta, la asistencia y el veto de tres meses, que
-- lo escribe un disparador sobre `table_members`. La reserva no lleva cargo:
-- los dos puestos los pagó quien reserva, y por eso al cancelar la suya no
-- se le devuelve nada a nadie.
alter table bookings add column if not exists mas_uno_de uuid references bookings(id) on delete cascade;

-- Un acompañante VIVO por reserva. Si se baja, su fila queda cancelada y el
-- siguiente entra en otra.
create unique index if not exists bookings_un_acompanante_vivo
  on bookings (mas_uno_de)
  where mas_uno_de is not null
    and status in ('held', 'pending_payment', 'confirmed', 'attended', 'no_show');

comment on column bookings.mas_uno_de is
  'En una fecha +1: la reserva de quien invitó. Nula en la de quien reserva.';

-- 3 · El enlace. Uno vivo por reserva: cambiar de acompañante lo anula y
-- crea otro, y el viejo deja de valer para siempre.
create table if not exists mas_uno_invitaciones (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  token       text not null unique,
  creada_en   timestamptz not null default now(),
  anulada_en  timestamptz,
  -- Quién se quedó el puesto: la primera persona cuya verificación se
  -- aprobó. Desde aquí el enlace ya no sienta a nadie más.
  usada_por   uuid references profiles(id) on delete set null,
  usada_en    timestamptz
);

create unique index if not exists mas_uno_invitaciones_viva
  on mas_uno_invitaciones (booking_id)
  where anulada_en is null;

comment on table mas_uno_invitaciones is
  'El enlace que comparte quien reserva una fecha +1. El puesto es de la '
  'primera persona que entra por él y queda verificada.';

-- 4 · Quién entró por cada enlace. Pueden ser varias personas: lo abren dos,
-- se dan de alta las dos, y gana la primera a la que se le aprueba la
-- verificación. La otra queda como socia normal.
create table if not exists mas_uno_candidatos (
  invitacion_id uuid not null references mas_uno_invitaciones(id) on delete cascade,
  profile_id    uuid not null references profiles(id) on delete cascade,
  unido_en      timestamptz not null default now(),
  primary key (invitacion_id, profile_id)
);

create index if not exists mas_uno_candidatos_perfil on mas_uno_candidatos (profile_id);

-- Nadie las lee desde el navegador: sin políticas, solo la llave de servicio.
alter table mas_uno_invitaciones enable row level security;
alter table mas_uno_candidatos enable row level security;

-- 5 · El reparto tiene que saber quién viene con quién. Al final de la
-- vista: `create or replace view` solo deja añadir columnas por el final.
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
       pt.drink_level,
       b.mas_uno_de
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

-- 6 · Los avisos del flujo. Los textos los aprueba Michael antes de que
-- exista la primera fecha +1.
alter type email_kind_t add value if not exists 'mas_uno_recordatorio';
alter type email_kind_t add value if not exists 'mas_uno_confirmado';
alter type email_kind_t add value if not exists 'mas_uno_se_bajo';
alter type email_kind_t add value if not exists 'mas_uno_cancelada';
-- Al acompañante, cuando quien le invitó cancela o cambia de acompañante.
alter type email_kind_t add value if not exists 'mas_uno_sin_puesto';
