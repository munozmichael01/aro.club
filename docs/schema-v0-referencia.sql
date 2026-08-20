-- =====================================================================
-- ESQUEMA DE BASE DE DATOS
-- Producto de social dining (codename: MESA) - Caracas
-- Postgres 15 / Supabase
--
-- PRINCIPIO DE DISENO CENTRAL:
-- El esquema es NEUTRAL respecto al modelo de cobro. Soporta simultaneamente
-- pago por evento, packs prepago (creditos) y suscripcion mensual, sin
-- migraciones. La decision comercial se toma con datos del piloto, no ahora.
--
-- SEGUNDO PRINCIPIO:
-- Las respuestas del cuestionario son clave-valor versionadas. Cambiar el
-- cuestionario NO requiere alterar tablas.
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- =====================================================================
-- 1. ENUMS
-- =====================================================================

create type gender_t as enum ('female', 'male', 'non_binary', 'undisclosed');

-- Eje de arraigo: es la variable diferencial del producto en Venezuela.
-- returnee  = se fue del pais y volvio
-- stayed    = nunca se fue, circulo erosionado por la diaspora
-- relocated = se mudo a Caracas desde el interior
-- foreigner = extranjero residente
create type rootedness_t as enum ('returnee', 'stayed', 'relocated', 'foreigner');

-- Autoevaluacion de energia social. Clave para el balance de mesa.
create type social_energy_t as enum ('listener', 'balanced', 'driver');

create type member_status_t as enum (
  'lead',                  -- dejo correo, no completo cuestionario
  'pending_questionnaire',
  'pending_verification',
  'active',
  'paused',                -- el usuario pidio pausa
  'banned'
);

create type verification_kind_t as enum ('id_document', 'selfie', 'social_profile', 'referral');
create type verification_status_t as enum ('pending', 'approved', 'rejected', 'expired');

create type event_format_t as enum (
  'dinner',        -- cena ancla, mesa de 6
  'women_dinner',  -- solo mujeres
  'coffee',
  'walk',
  'run',
  'drinks'
);
create type event_status_t as enum (
  'draft', 'open', 'locked', 'matched', 'running', 'completed', 'cancelled'
);

create type booking_status_t as enum (
  'held',              -- reserva provisional sin pago
  'pending_payment',
  'confirmed',
  'waitlisted',
  'cancelled_by_user',
  'cancelled_by_ops',
  'no_show',
  'attended'
);

create type payment_method_t as enum (
  'pago_movil', 'usdt', 'zelle', 'bank_transfer', 'cash', 'credits', 'membership', 'comp'
);
create type payment_status_t as enum (
  'awaiting_proof', 'under_review', 'confirmed', 'rejected', 'refunded'
);

create type credit_reason_t as enum (
  'pack_purchase', 'event_charge', 'refund', 'goodwill', 'referral_bonus',
  'no_show_penalty', 'expiry', 'manual_adjustment'
);

create type membership_status_t as enum ('active', 'grace', 'expired', 'cancelled');

create type incident_severity_t as enum ('low', 'medium', 'high', 'critical');


-- =====================================================================
-- 2. IDENTIDAD Y PERFIL
-- =====================================================================

-- Extiende auth.users de Supabase. NUNCA duplicar credenciales aqui.
create table profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  full_name           text not null,
  display_name        text,                    -- como aparece ante otros comensales
  phone_e164          text unique,             -- +58414XXXXXXX, canal WhatsApp
  email               text unique not null,
  birthdate           date,
  gender              gender_t not null default 'undisclosed',
  rootedness          rootedness_t,
  neighborhood        text,                    -- Chacao, Baruta, El Hatillo, etc.
  status              member_status_t not null default 'lead',
  locale              text not null default 'es-VE',
  invited_by          uuid references profiles(id) on delete set null,
  invite_depth        int not null default 0,  -- 0 = semilla, 1 = invitado por semilla...
  whatsapp_opt_in     boolean not null default true,
  notes_ops           text,                    -- solo visible para operaciones
  first_event_at      timestamptz,
  last_event_at       timestamptz,
  events_attended     int not null default 0,  -- denormalizado, mantenido por trigger
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index on profiles (status);
create index on profiles (rootedness);
create index on profiles (invited_by);
create index profiles_name_trgm on profiles using gin (full_name gin_trgm_ops);

-- Edad calculada. El matcher usa esto, no birthdate directo.
create or replace function age_years(d date) returns int
language sql immutable as $$
  select extract(year from age(current_date, d))::int;
$$;


-- =====================================================================
-- 3. VERIFICACION Y CONFIANZA
-- =====================================================================

create table verifications (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references profiles(id) on delete cascade,
  kind            verification_kind_t not null,
  status          verification_status_t not null default 'pending',
  storage_path    text,               -- bucket privado de Supabase Storage
  external_ref    text,               -- URL de LinkedIn/Instagram si aplica
  reviewed_by     uuid references profiles(id),
  reviewed_at     timestamptz,
  rejection_note  text,
  expires_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index on verifications (profile_id, kind, status);
create index on verifications (status) where status = 'pending';

-- Un perfil esta verificado cuando tiene id_document + selfie aprobados.
create or replace view v_verified_profiles as
select p.id
from profiles p
where exists (select 1 from verifications v
              where v.profile_id = p.id and v.kind = 'id_document' and v.status = 'approved')
  and exists (select 1 from verifications v
              where v.profile_id = p.id and v.kind = 'selfie' and v.status = 'approved');


-- =====================================================================
-- 4. CUESTIONARIO VERSIONADO (clave-valor)
-- =====================================================================

create table questionnaire_versions (
  id            serial primary key,
  version       text not null unique,   -- 'v1', 'v2'...
  is_active     boolean not null default false,
  published_at  timestamptz,
  created_at    timestamptz not null default now()
);

create unique index one_active_questionnaire
  on questionnaire_versions (is_active) where is_active;

create table questions (
  id                 uuid primary key default gen_random_uuid(),
  version_id         int not null references questionnaire_versions(id) on delete cascade,
  key                text not null,          -- 'industry', 'interests', 'social_energy'
  prompt             text not null,
  input_type         text not null,          -- 'single', 'multi', 'scale', 'text', 'date'
  options            jsonb,                  -- catalogo de opciones
  is_required        boolean not null default true,
  is_matching_input  boolean not null default false,  -- entra al algoritmo
  sort_order         int not null,
  unique (version_id, key)
);

create table answers (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  version_id   int not null references questionnaire_versions(id),
  question_key text not null,
  value        jsonb not null,        -- escalar o array, siempre jsonb
  answered_at  timestamptz not null default now(),
  unique (profile_id, version_id, question_key)
);

create index on answers (profile_id);
create index answers_value_gin on answers using gin (value);

-- Fila desnormalizada que consume el matcher. Se reconstruye al enviar
-- el cuestionario. Evita que el algoritmo haga pivots sobre answers.
create table profile_traits (
  profile_id        uuid primary key references profiles(id) on delete cascade,
  version_id        int not null references questionnaire_versions(id),
  age               int,
  gender            gender_t,
  rootedness        rootedness_t,
  industry          text,
  social_energy     social_energy_t,
  interests         text[] not null default '{}',
  conversation_topics text[] not null default '{}',
  dealbreakers      text[] not null default '{}',
  budget_tier       int,                 -- 1..3, por si se abren gamas
  languages         text[] not null default '{es}',
  zones             text[] not null default '{}',   -- zonas donde puede asistir
  availability      text[] not null default '{}',   -- 'tue_pm','wed_pm','sat_am'
  employer          text,                -- para excluir compañeros de trabajo
  computed_at       timestamptz not null default now()
);

create index on profile_traits (age);
create index on profile_traits (industry);
create index profile_traits_interests_gin on profile_traits using gin (interests);


-- =====================================================================
-- 5. EXCLUSIONES E HISTORIAL DE ENCUENTROS
-- =====================================================================

-- Par que NUNCA debe coincidir. Simetrico: se guarda con a < b.
create table exclusions (
  profile_a   uuid not null references profiles(id) on delete cascade,
  profile_b   uuid not null references profiles(id) on delete cascade,
  reason      text not null,   -- 'user_request','same_employer','ex_partner','incident'
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now(),
  primary key (profile_a, profile_b),
  check (profile_a < profile_b)
);

-- Historial de coincidencias. Sostiene la regla de no repetir.
-- El plazo son TRES meses, no seis: bajo en la entrega 12 porque con poca
-- gente seis agota el pool y deja mesas sin armar. Vive en una constante,
-- `MESES_SIN_REPETIR` en src/lib/reparto/pool.ts.
-- Se puede derivar de table_members, pero materializarlo hace el matcher
-- ordenes de magnitud mas rapido.
create table pair_encounters (
  profile_a     uuid not null references profiles(id) on delete cascade,
  profile_b     uuid not null references profiles(id) on delete cascade,
  times_met     int not null default 1,
  last_met_at   timestamptz not null default now(),
  primary key (profile_a, profile_b),
  check (profile_a < profile_b)
);

create index on pair_encounters (last_met_at);


-- =====================================================================
-- 6. RESTAURANTES Y EVENTOS
-- =====================================================================

create table restaurants (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  zone                text not null,           -- 'Las Mercedes','Los Palos Grandes'
  address             text not null,
  maps_url            text,
  contact_name        text,
  contact_phone       text,
  -- Terminos comerciales negociados
  fixed_menu_usd      numeric(8,2),            -- precio del menu cerrado por persona
  commission_per_head numeric(8,2),            -- lo que el restaurante te paga
  commission_pct      numeric(5,2),
  max_tables          int not null default 4,
  has_parking         boolean not null default false,
  is_active           boolean not null default true,
  safety_notes        text,
  avg_rating          numeric(3,2),
  created_at          timestamptz not null default now()
);

create index on restaurants (zone, is_active);

create table events (
  id              uuid primary key default gen_random_uuid(),
  format          event_format_t not null default 'dinner',
  starts_at       timestamptz not null,
  booking_closes_at timestamptz not null,       -- cutoff, 48h antes
  reveal_at       timestamptz not null,         -- revelacion de restaurante, 12:00 del dia
  restaurant_id   uuid references restaurants(id),
  status          event_status_t not null default 'draft',
  seats_per_table int not null default 6,
  min_tables      int not null default 2,       -- umbral para no cancelar
  max_seats       int,
  price_usd       numeric(8,2),                 -- precio all-in de este evento
  credit_cost     int not null default 1,       -- cuantos creditos consume
  age_band_min    int,
  age_band_max    int,
  city            text not null default 'Caracas',
  created_at      timestamptz not null default now(),
  check (booking_closes_at < starts_at),
  check (reveal_at <= starts_at)
);

create index on events (status, starts_at);
create index on events (starts_at);


-- =====================================================================
-- 7. RESERVAS
-- =====================================================================

create table bookings (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references events(id) on delete cascade,
  profile_id      uuid not null references profiles(id) on delete cascade,
  status          booking_status_t not null default 'held',
  held_until      timestamptz,                  -- expira la reserva sin pago
  confirmed_at    timestamptz,
  cancelled_at    timestamptz,
  cancel_reason   text,
  attended_marked_by uuid references profiles(id),
  created_at      timestamptz not null default now(),
  unique (event_id, profile_id)
);

create index on bookings (event_id, status);
create index on bookings (profile_id, created_at desc);
-- Cola de reservas provisionales por expirar
create index on bookings (held_until) where status = 'held';


-- =====================================================================
-- 8. COBRO: NEUTRAL AL MODELO DE NEGOCIO
-- Convive pago por evento + creditos prepago + suscripcion.
-- =====================================================================

-- Catalogo comercial. Cambiar precios no requiere deploy.
create table products (
  id              uuid primary key default gen_random_uuid(),
  sku             text not null unique,     -- 'single_dinner','pack_4','monthly'
  name            text not null,
  kind            text not null,            -- 'single','credit_pack','membership'
  price_usd       numeric(8,2) not null,
  credits_granted int,                      -- para packs
  duration_days   int,                      -- para membresias
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Toda intencion de cobro pasa por aqui, sea del riel que sea.
create table payments (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references profiles(id) on delete cascade,
  product_id        uuid references products(id),
  booking_id        uuid references bookings(id) on delete set null,
  amount_usd        numeric(8,2) not null,
  amount_local      numeric(14,2),           -- monto en bolivares si aplica
  fx_rate           numeric(14,4),           -- tasa usada ese dia
  method            payment_method_t not null,
  status            payment_status_t not null default 'awaiting_proof',
  -- Conciliacion manual: el usuario declara la referencia, ops la valida.
  reference_code    text,                    -- ultimos digitos de Pago Movil
  proof_path        text,                    -- captura en storage privado
  tx_hash           text,                    -- para USDT
  reviewed_by       uuid references profiles(id),
  reviewed_at       timestamptz,
  rejection_note    text,
  created_at        timestamptz not null default now()
);

create index on payments (status) where status in ('awaiting_proof','under_review');
create index on payments (profile_id, created_at desc);
create index on payments (reference_code);

-- Libro mayor de creditos. Fuente de verdad del saldo: nunca guardar
-- un balance suelto, siempre sumar el ledger.
create table credit_ledger (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  delta        int not null,                 -- positivo o negativo
  reason       credit_reason_t not null,
  payment_id   uuid references payments(id) on delete set null,
  booking_id   uuid references bookings(id) on delete set null,
  expires_at   timestamptz,
  note         text,
  created_at   timestamptz not null default now()
);

create index on credit_ledger (profile_id, created_at desc);

create or replace view v_credit_balance as
select profile_id, coalesce(sum(delta), 0)::int as balance
from credit_ledger
where expires_at is null or expires_at > now()
group by profile_id;

-- Suscripcion. Sin debito automatico en Venezuela: cada renovacion es
-- un pago nuevo que ops concilia. Por eso hay periodo de gracia.
create table memberships (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  product_id    uuid not null references products(id),
  status        membership_status_t not null default 'active',
  started_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  grace_until   timestamptz,
  payment_id    uuid references payments(id),
  created_at    timestamptz not null default now()
);

create index on memberships (profile_id, status);
create index on memberships (expires_at) where status = 'active';


-- =====================================================================
-- 9. MATCHING
-- =====================================================================

-- Cada corrida del algoritmo queda auditada. Permite comparar versiones
-- de pesos contra satisfaccion real.
create table matching_runs (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references events(id) on delete cascade,
  algo_version   text not null,           -- 'v1.3'
  weights        jsonb not null,          -- {cohesion:0.30, diversity:0.25,...}
  pool_size      int not null,
  tables_created int not null,
  avg_score      numeric(6,3),
  min_score      numeric(6,3),
  runtime_ms     int,
  is_published   boolean not null default false,
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now()
);

create table dinner_tables (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references events(id) on delete cascade,
  run_id         uuid references matching_runs(id) on delete set null,
  table_number   int not null,
  score          numeric(6,3),
  score_breakdown jsonb,                  -- desglose por componente
  restaurant_id  uuid references restaurants(id),
  notes_ops      text,
  created_at     timestamptz not null default now(),
  unique (event_id, table_number)
);

create table table_members (
  table_id     uuid not null references dinner_tables(id) on delete cascade,
  profile_id   uuid not null references profiles(id) on delete cascade,
  booking_id   uuid not null references bookings(id) on delete cascade,
  seat_order   int,
  primary key (table_id, profile_id)
);

create index on table_members (profile_id);
create index on table_members (booking_id);


-- =====================================================================
-- 10. FEEDBACK
-- =====================================================================

-- Valoracion de la mesa y del restaurante. Publica solo en agregado.
create table table_feedback (
  id                 uuid primary key default gen_random_uuid(),
  table_id           uuid not null references dinner_tables(id) on delete cascade,
  profile_id         uuid not null references profiles(id) on delete cascade,
  nps                int check (nps between 0 and 10),
  restaurant_rating  int check (restaurant_rating between 1 and 5),
  conversation_rating int check (conversation_rating between 1 and 5),
  connections_made   int,                  -- con cuantos intercambio contacto
  would_repeat       boolean,
  comment            text,
  created_at         timestamptz not null default now(),
  unique (table_id, profile_id)
);

-- Valoracion persona a persona. SIEMPRE privada. Nunca se expone al valorado.
create table peer_feedback (
  id            uuid primary key default gen_random_uuid(),
  table_id      uuid not null references dinner_tables(id) on delete cascade,
  rater_id      uuid not null references profiles(id) on delete cascade,
  rated_id      uuid not null references profiles(id) on delete cascade,
  signal        text not null,     -- 'connect','neutral','avoid'
  flag_conduct  boolean not null default false,
  comment       text,
  created_at    timestamptz not null default now(),
  unique (table_id, rater_id, rated_id),
  check (rater_id <> rated_id)
);

create index on peer_feedback (rated_id);
create index on peer_feedback (flag_conduct) where flag_conduct;


-- =====================================================================
-- 11. SEGURIDAD, INCIDENTES Y OPERACION
-- =====================================================================

create table incident_reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid references profiles(id) on delete set null,
  subject_id    uuid references profiles(id) on delete set null,
  event_id      uuid references events(id) on delete set null,
  severity      incident_severity_t not null default 'medium',
  description   text not null,
  action_taken  text,
  resolved_at   timestamptz,
  resolved_by   uuid references profiles(id),
  created_at    timestamptz not null default now()
);

create index on incident_reports (resolved_at) where resolved_at is null;

create table waitlist (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  phone_e164   text,
  full_name    text,
  source       text,                -- 'instagram','referral','run_club'
  referral_code text,
  city         text default 'Caracas',
  converted_profile_id uuid references profiles(id),
  created_at   timestamptz not null default now()
);

create table ops_audit_log (
  id          bigserial primary key,
  actor_id    uuid references profiles(id),
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

create index on ops_audit_log (entity, entity_id);
create index on ops_audit_log (created_at desc);


-- =====================================================================
-- 12. TRIGGERS
-- =====================================================================

-- updated_at automatico
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_profiles_touch before update on profiles
for each row execute function touch_updated_at();

-- Al publicar mesas, registrar los pares en pair_encounters
create or replace function record_pair_encounters() returns trigger
language plpgsql as $$
declare
  t_event_at timestamptz;
begin
  select e.starts_at into t_event_at
  from dinner_tables dt join events e on e.id = dt.event_id
  where dt.id = new.table_id;

  insert into pair_encounters (profile_a, profile_b, times_met, last_met_at)
  select least(new.profile_id, tm.profile_id),
         greatest(new.profile_id, tm.profile_id),
         1,
         coalesce(t_event_at, now())
  from table_members tm
  where tm.table_id = new.table_id and tm.profile_id <> new.profile_id
  on conflict (profile_a, profile_b) do update
    set times_met = pair_encounters.times_met + 1,
        last_met_at = greatest(pair_encounters.last_met_at, excluded.last_met_at);
  return new;
end $$;

create trigger trg_pair_encounters after insert on table_members
for each row execute function record_pair_encounters();

-- Contador de asistencia
create or replace function bump_attendance() returns trigger
language plpgsql as $$
begin
  if new.status = 'attended' and (old.status is distinct from 'attended') then
    update profiles
       set events_attended = events_attended + 1,
           last_event_at = now(),
           first_event_at = coalesce(first_event_at, now())
     where id = new.profile_id;
  end if;
  return new;
end $$;

create trigger trg_bump_attendance after update on bookings
for each row execute function bump_attendance();


-- =====================================================================
-- 13. VISTAS OPERATIVAS
-- =====================================================================

-- Pool elegible para matching de un evento
create or replace view v_matching_pool as
select b.event_id,
       b.id as booking_id,
       p.id as profile_id,
       pt.age, pt.gender, pt.rootedness, pt.industry, pt.social_energy,
       pt.interests, pt.conversation_topics, pt.employer, pt.languages
from bookings b
join profiles p on p.id = b.profile_id
join profile_traits pt on pt.profile_id = p.id
where b.status = 'confirmed'
  and p.status = 'active'
  and exists (select 1 from v_verified_profiles vp where vp.id = p.id);

-- Metrica que decide todo: segunda asistencia dentro de 60 dias
create or replace view v_second_attendance as
with firsts as (
  select profile_id, min(e.starts_at) as first_at
  from bookings b join events e on e.id = b.event_id
  where b.status = 'attended'
  group by profile_id
),
seconds as (
  select f.profile_id, f.first_at,
         min(e.starts_at) filter (where e.starts_at > f.first_at) as second_at
  from firsts f
  join bookings b on b.profile_id = f.profile_id and b.status = 'attended'
  join events e on e.id = b.event_id
  group by f.profile_id, f.first_at
)
select profile_id,
       first_at,
       second_at,
       (second_at is not null and second_at <= first_at + interval '60 days') as returned_60d
from seconds;

-- Varianza de NPS entre mesas del mismo evento: revela si el matching aporta
create or replace view v_matching_signal as
select e.id as event_id,
       e.starts_at,
       count(distinct dt.id) as tables_count,
       round(avg(tf.nps), 2) as avg_nps,
       round(stddev_pop(table_avg.nps_avg), 3) as between_table_stddev
from events e
join dinner_tables dt on dt.event_id = e.id
join table_feedback tf on tf.table_id = dt.id
join lateral (
  select avg(tf2.nps) as nps_avg
  from table_feedback tf2 where tf2.table_id = dt.id
) table_avg on true
group by e.id, e.starts_at;


-- =====================================================================
-- 14. ROW LEVEL SECURITY (esqueleto)
-- Activar RLS en TODAS las tablas. El service_role del backend las salta.
-- =====================================================================

alter table profiles          enable row level security;
alter table answers           enable row level security;
alter table profile_traits    enable row level security;
alter table verifications     enable row level security;
alter table bookings          enable row level security;
alter table payments          enable row level security;
alter table credit_ledger     enable row level security;
alter table memberships       enable row level security;
alter table table_feedback    enable row level security;
alter table peer_feedback     enable row level security;
alter table table_members     enable row level security;
alter table incident_reports  enable row level security;

create policy own_profile on profiles
  for select using (auth.uid() = id);
create policy update_own_profile on profiles
  for update using (auth.uid() = id);

create policy own_answers on answers
  for all using (auth.uid() = profile_id);

create policy own_bookings on bookings
  for all using (auth.uid() = profile_id);

create policy own_payments on payments
  for select using (auth.uid() = profile_id);

create policy own_credits on credit_ledger
  for select using (auth.uid() = profile_id);

-- El feedback persona a persona NUNCA es legible por el valorado.
create policy peer_feedback_writer_only on peer_feedback
  for select using (auth.uid() = rater_id);

-- Los compañeros de mesa solo son visibles tras la revelacion del evento.
create policy tablemates_after_reveal on table_members
  for select using (
    exists (
      select 1
      from dinner_tables dt
      join events e on e.id = dt.event_id
      join table_members me on me.table_id = dt.id
      where dt.id = table_members.table_id
        and me.profile_id = auth.uid()
        and now() >= e.reveal_at
    )
  );


-- =====================================================================
-- 15. SEED MINIMO
-- =====================================================================

insert into questionnaire_versions (version, is_active, published_at)
values ('v1', true, now());

insert into products (sku, name, kind, price_usd, credits_granted, duration_days) values
  ('single_dinner', 'Cena suelta',        'single',      22.00, null, null),
  ('founding',      'Founding member',    'single',       8.00, null, null),
  ('pack_4',        'Pack 4 encuentros',  'credit_pack', 78.00,    4, null),
  ('monthly',       'Membresia mensual',  'membership',  38.00, null,  30);
