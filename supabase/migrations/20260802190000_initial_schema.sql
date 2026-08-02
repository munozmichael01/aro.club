-- =====================================================================
-- ARO CLUB - Esquema inicial
-- Social dining, Caracas. Postgres 17 / Supabase.
--
-- PRINCIPIO 1: el esquema es neutral al modelo de cobro. Soporta pago por
-- evento, packs prepago (creditos) y suscripcion sin migraciones. El MVP
-- solo usa pago por evento + pack de 4.
--
-- PRINCIPIO 2: las respuestas del cuestionario son clave-valor versionadas.
-- Cambiar el cuestionario NO requiere alterar tablas.
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- =====================================================================
-- 1. ENUMS
-- =====================================================================

create type gender_t as enum ('female', 'male', 'non_binary', 'undisclosed');

-- Eje de arraigo: la variable diferencial del producto en Venezuela.
-- returnee  = se fue del pais y volvio
-- stayed    = nunca se fue, circulo erosionado por la diaspora
-- relocated = se mudo a Caracas desde el interior
-- foreigner = extranjero residente
-- visiting  = vive en el exterior y esta de visita (temporal)
create type rootedness_t as enum ('returnee', 'stayed', 'relocated', 'foreigner', 'visiting');

create type social_energy_t as enum ('listener', 'balanced', 'driver');

create type app_role_t as enum ('member', 'ops', 'admin');

create type member_status_t as enum (
  'lead', 'pending_questionnaire', 'pending_verification',
  'active', 'paused', 'banned'
);

create type verification_kind_t as enum ('id_document', 'selfie', 'social_profile', 'referral');
create type verification_status_t as enum ('pending', 'approved', 'rejected', 'expired');

create type event_format_t as enum (
  'dinner', 'foodie_dinner', 'women_dinner', 'coffee', 'drinks',
  'walk', 'hike', 'run', 'padel', 'pilates', 'cycling'
);
create type event_status_t as enum (
  'draft', 'open', 'locked', 'matched', 'running', 'completed', 'cancelled'
);

create type booking_status_t as enum (
  'held', 'pending_payment', 'confirmed', 'waitlisted',
  'cancelled_by_user', 'cancelled_by_ops', 'no_show', 'attended'
);

create type payment_method_t as enum (
  'pago_movil', 'bank_transfer', 'c2p', 'usdt', 'zelle', 'cash',
  'credits', 'membership', 'comp'
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
-- 2. FUNCIONES AUXILIARES
-- =====================================================================

create or replace function age_years(d date) returns int
language sql immutable as $$
  select extract(year from age(current_date, d))::int;
$$;

-- Normaliza el nombre del empleador para que la restriccion dura de
-- "nunca dos personas de la misma empresa" no se rompa por mayusculas,
-- acentos o sufijos societarios. Immutable a proposito: alimenta una
-- columna generada.
create or replace function normalize_employer(raw text) returns text
language sql immutable as $$
  with a as (
    select translate(lower(coalesce(raw, '')),
                     'áàäâãéèëêíìïîóòöôõúùüûñç',
                     'aaaaaeeeeiiiiooooouuuunc') as t
  ), b as (
    select btrim(regexp_replace(t, '[^a-z0-9]+', ' ', 'g')) as t from a
  ), c as (
    select btrim(regexp_replace(t,
      ' (ca|sa|srl|sca|scs|llc|inc|corp|ltd|ltda|compania|company)$', '', 'g')) as t
    from b
  )
  select nullif(btrim(regexp_replace(t, '\s+', ' ', 'g')), '') from c;
$$;


-- =====================================================================
-- 3. IDENTIDAD Y PERFIL
-- =====================================================================

create table profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  full_name           text not null,
  display_name        text,                    -- lo unico que ven los demas comensales
  phone_e164          text unique,             -- +58414XXXXXXX, canal WhatsApp
  email               text unique not null,
  birthdate           date,
  gender              gender_t not null default 'undisclosed',
  rootedness          rootedness_t,
  neighborhood        text,
  status              member_status_t not null default 'lead',
  role                app_role_t not null default 'member',
  locale              text not null default 'es-VE',
  invited_by          uuid references profiles(id) on delete set null,
  invite_depth        int not null default 0,
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
create index on profiles (role) where role <> 'member';
create index profiles_name_trgm on profiles using gin (full_name gin_trgm_ops);

-- Security definer: al ejecutarse como owner de la tabla salta RLS, lo que
-- evita recursion infinita en las politicas que la invocan.
create or replace function is_ops() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('ops', 'admin')
  );
$$;


-- =====================================================================
-- 4. CATALOGO DE ZONAS
-- Fuente unica compartida entre el cuestionario y los restaurantes.
-- Operaciones anade una zona sin desplegar codigo.
-- =====================================================================

create table zones (
  slug        text primary key,
  name        text not null,
  municipality text,
  is_active   boolean not null default true,
  sort_order  int not null default 0
);


-- =====================================================================
-- 5. VERIFICACION Y CONFIANZA
-- =====================================================================

create table verifications (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references profiles(id) on delete cascade,
  kind            verification_kind_t not null,
  status          verification_status_t not null default 'pending',
  storage_path    text,               -- bucket privado
  external_ref    text,
  name_matches    boolean,            -- el nombre del documento coincide con el declarado
  age_confirmed   boolean,            -- la fecha de nacimiento coincide con el documento
  reviewed_by     uuid references profiles(id),
  reviewed_at     timestamptz,
  rejection_note  text,
  expires_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index on verifications (profile_id, kind, status);
create index on verifications (status) where status = 'pending';

create or replace view v_verified_profiles as
select p.id
from profiles p
where exists (select 1 from verifications v
              where v.profile_id = p.id and v.kind = 'id_document' and v.status = 'approved')
  and exists (select 1 from verifications v
              where v.profile_id = p.id and v.kind = 'selfie' and v.status = 'approved');


-- =====================================================================
-- 6. CUESTIONARIO VERSIONADO (clave-valor)
-- =====================================================================

create table questionnaire_versions (
  id            serial primary key,
  version       text not null unique,
  is_active     boolean not null default false,
  published_at  timestamptz,
  created_at    timestamptz not null default now()
);

create unique index one_active_questionnaire
  on questionnaire_versions (is_active) where is_active;

create table questions (
  id                 uuid primary key default gen_random_uuid(),
  version_id         int not null references questionnaire_versions(id) on delete cascade,
  key                text not null,
  prompt             text not null,
  help_text          text,
  input_type         text not null,          -- 'single','multi','text','scale','date'
  options            jsonb,                  -- [{value,label,help?}]
  min_select         int,                    -- solo multi
  max_select         int,                    -- solo multi
  is_required        boolean not null default true,
  is_matching_input  boolean not null default false,
  screen             int not null default 1,
  sort_order         int not null,
  unique (version_id, key)
);

create index on questions (version_id, screen, sort_order);

create table answers (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  version_id   int not null references questionnaire_versions(id),
  question_key text not null,
  value        jsonb not null,
  answered_at  timestamptz not null default now(),
  unique (profile_id, version_id, question_key)
);

create index on answers (profile_id);
create index answers_value_gin on answers using gin (value);

-- Fila desnormalizada que consume el matcher. Se reconstruye al enviar el
-- cuestionario. Evita que el algoritmo pivote sobre answers.
create table profile_traits (
  profile_id          uuid primary key references profiles(id) on delete cascade,
  version_id          int not null references questionnaire_versions(id),
  age                 int,
  gender              gender_t,
  rootedness          rootedness_t,
  industry            text,
  employer            text,
  employer_normalized text generated always as (normalize_employer(employer)) stored,
  life_stage          text,
  social_energy       social_energy_t,
  intention           text,
  romantic_openness   text,                -- 'open','neutral','closed'. NUNCA se muestra.
  dining_focus        text,                -- 'conversation','both','food'
  formats             text[] not null default '{}',
  interests           text[] not null default '{}',
  conversation_topics text[] not null default '{}',
  dealbreakers        text[] not null default '{}',
  dietary             text[] not null default '{}',
  budget_tier         int check (budget_tier between 1 and 4),
  languages           text[] not null default '{es}',
  zones               text[] not null default '{}',
  availability        text[] not null default '{}',
  computed_at         timestamptz not null default now()
);

create index on profile_traits (age);
create index on profile_traits (industry);
create index on profile_traits (employer_normalized);
create index on profile_traits (budget_tier);
create index profile_traits_interests_gin on profile_traits using gin (interests);
create index profile_traits_employer_trgm on profile_traits
  using gin (employer_normalized gin_trgm_ops);

-- Fusion de empleadores confirmada por operaciones. La agrupacion por
-- trigramas propone; una persona confirma. Nunca se escribe automatico:
-- si se fusiona mal, alguien cena con su jefe.
create table employer_aliases (
  alias        text primary key,          -- valor normalizado
  canonical    text not null,
  confirmed_by uuid references profiles(id),
  created_at   timestamptz not null default now()
);

create index on employer_aliases (canonical);


-- =====================================================================
-- 7. EXCLUSIONES E HISTORIAL DE ENCUENTROS
-- =====================================================================

create table exclusions (
  profile_a   uuid not null references profiles(id) on delete cascade,
  profile_b   uuid not null references profiles(id) on delete cascade,
  reason      text not null,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now(),
  primary key (profile_a, profile_b),
  check (profile_a < profile_b)
);

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
-- 8. RESTAURANTES Y EVENTOS
-- =====================================================================

create table restaurants (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  zone_slug           text references zones(slug),
  address             text not null,
  maps_url            text,
  facade_photo_path   text,                    -- foto de la ENTRADA, no del plato
  contact_name        text,
  contact_phone       text,
  fixed_menu_usd      numeric(8,2),            -- menu cerrado negociado por persona
  avg_check_usd       numeric(8,2),            -- gasto tipico por persona
  budget_tier         int check (budget_tier between 1 and 4),
  commission_per_head numeric(8,2),
  commission_pct      numeric(5,2),
  -- 1 = se puede conversar sin esfuerzo, 3 = hay que levantar la voz.
  -- Una mesa que viene a conversar en un sitio ruidoso es una mesa arruinada.
  noise_level         int check (noise_level between 1 and 3),
  max_tables          int not null default 4,
  has_parking         boolean not null default false,
  is_active           boolean not null default true,
  is_after_venue      boolean not null default false,  -- sirve como bar del segundo acto
  safety_notes        text,
  avg_rating          numeric(3,2),
  created_at          timestamptz not null default now()
);

create index on restaurants (zone_slug, is_active);
create index on restaurants (budget_tier) where is_active;
create index on restaurants (is_after_venue) where is_after_venue;

create table events (
  id                uuid primary key default gen_random_uuid(),
  format            event_format_t not null default 'dinner',
  starts_at         timestamptz not null,
  booking_closes_at timestamptz not null,       -- cutoff, 48h antes
  reveal_at         timestamptz not null,       -- revelacion, 12:00 del dia
  restaurant_id     uuid references restaurants(id),
  status            event_status_t not null default 'draft',
  seats_per_table   int not null default 6,
  min_tables        int not null default 2,
  max_seats         int,
  price_usd         numeric(8,2),
  credit_cost       int not null default 1,
  age_band_min      int,
  age_band_max      int,
  zone_slug         text references zones(slug),
  city              text not null default 'Caracas',
  -- Segundo acto: solo viernes y sabados. Un unico bar para todas las mesas.
  -- Multiplica densidad: N mesas de 6 se convierten en una red de 6N.
  after_venue_id    uuid references restaurants(id),
  after_reveal_at   timestamptz,
  after_starts_at   timestamptz,
  created_at        timestamptz not null default now(),
  check (booking_closes_at < starts_at),
  check (reveal_at <= starts_at),
  check (after_starts_at is null or after_starts_at > starts_at)
);

create index on events (status, starts_at);
create index on events (starts_at);


-- =====================================================================
-- 9. RESERVAS
-- =====================================================================

create table bookings (
  id                 uuid primary key default gen_random_uuid(),
  event_id           uuid not null references events(id) on delete cascade,
  profile_id         uuid not null references profiles(id) on delete cascade,
  status             booking_status_t not null default 'held',
  held_until         timestamptz,                  -- expira la reserva sin pago
  confirmed_at       timestamptz,
  cancelled_at       timestamptz,
  cancel_reason      text,
  after_rsvp         boolean,                      -- confirmo asistencia al segundo acto
  attended_marked_by uuid references profiles(id),
  created_at         timestamptz not null default now(),
  unique (event_id, profile_id)
);

create index on bookings (event_id, status);
create index on bookings (profile_id, created_at desc);
create index on bookings (held_until) where status = 'held';


-- =====================================================================
-- 10. COBRO
-- Conciliacion manual asistida: no hay pasarela. El usuario paga por su
-- banco y reporta; operaciones concilia desde el panel.
-- =====================================================================

create table products (
  id              uuid primary key default gen_random_uuid(),
  sku             text not null unique,
  name            text not null,
  kind            text not null,            -- 'single','credit_pack','membership'
  price_usd       numeric(8,2) not null,
  credits_granted int,
  duration_days   int,
  is_active       boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

-- Datos de cobro editables por operaciones. NO van en variables de entorno:
-- cambiar un numero de cuenta no puede exigir un despliegue.
create table payment_accounts (
  id            uuid primary key default gen_random_uuid(),
  method        payment_method_t not null,
  label         text not null,
  bank_name     text,
  bank_code     text,
  phone_e164    text,             -- Pago Movil
  document_id   text,             -- cedula o RIF
  account_number text,            -- transferencia
  account_holder text,
  instructions  text,
  is_active     boolean not null default true,
  sort_order    int not null default 0,
  updated_at    timestamptz not null default now()
);

-- Tasa del dia. Con bolivares como unico riel, esto deja de ser un detalle:
-- es lo unico que convierte el precio en USD a lo que la gente paga.
create table fx_rates (
  rate_date   date primary key,
  usd_to_ves  numeric(14,4) not null,
  source      text not null default 'manual',
  set_by      uuid references profiles(id),
  created_at  timestamptz not null default now()
);

create table payments (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references profiles(id) on delete cascade,
  product_id        uuid references products(id),
  booking_id        uuid references bookings(id) on delete set null,
  amount_usd        numeric(8,2) not null,
  amount_local      numeric(14,2),           -- monto exacto a pagar, con centimos unicos
  fx_rate           numeric(14,4),
  -- Discriminador de centimos. Hace que monto + fecha identifiquen el pago
  -- de forma casi univoca contra el estado de cuenta del banco, sin
  -- integrar nada. Decision tomada antes del primer pago a proposito:
  -- meterla despues obligaria a migrar pagos viejos.
  cents_token       smallint,
  charge_date       date not null default (now() at time zone 'America/Caracas')::date,
  method            payment_method_t not null,
  status            payment_status_t not null default 'awaiting_proof',
  reference_code    text,                    -- referencia declarada por el usuario
  payer_bank        text,
  paid_at           timestamptz,
  proof_path        text,
  tx_hash           text,
  reviewed_by       uuid references profiles(id),
  reviewed_at       timestamptz,
  rejection_note    text,
  created_at        timestamptz not null default now()
);

create unique index payments_cents_token_uq on payments (charge_date, cents_token)
  where cents_token is not null;
create index on payments (status) where status in ('awaiting_proof','under_review');
create index on payments (profile_id, created_at desc);
create index on payments (reference_code);

-- Libro mayor de creditos. El saldo NUNCA se guarda suelto: se suma.
create table credit_ledger (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  delta        int not null,
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

-- Sin uso en el MVP (se descarto la suscripcion). Se deja porque no cuesta
-- nada y evita una migracion si se retoma.
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
-- 11. MATCHING
-- =====================================================================

create table matching_runs (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references events(id) on delete cascade,
  algo_version   text not null,
  weights        jsonb not null,          -- {cohesion:0.30, industry:0.25, ...}
  pool_size      int not null,
  tables_created int not null,
  avg_score      numeric(6,3),
  min_score      numeric(6,3),
  runtime_ms     int,
  is_published   boolean not null default false,
  unmatched      jsonb,                   -- quien quedo fuera y por que
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now()
);

create table dinner_tables (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references events(id) on delete cascade,
  run_id          uuid references matching_runs(id) on delete set null,
  table_number    int not null,
  score           numeric(6,3),
  score_breakdown jsonb,                  -- alimenta el "por que esta mesa" de la revelacion
  restaurant_id   uuid references restaurants(id),
  notes_ops       text,
  created_at      timestamptz not null default now(),
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
-- 12. FEEDBACK
-- =====================================================================

create table table_feedback (
  id                  uuid primary key default gen_random_uuid(),
  table_id            uuid not null references dinner_tables(id) on delete cascade,
  profile_id          uuid not null references profiles(id) on delete cascade,
  nps                 int check (nps between 0 and 10),
  restaurant_rating   int check (restaurant_rating between 1 and 5),
  conversation_rating int check (conversation_rating between 1 and 5),
  connections_made    int,
  would_repeat        boolean,
  attended_after      boolean,             -- fue al segundo acto
  comment             text,
  created_at          timestamptz not null default now(),
  unique (table_id, profile_id)
);

-- Persona a persona. SIEMPRE privada. Nunca se expone al valorado.
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
-- 13. SEGURIDAD, INCIDENTES Y OPERACION
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
  id                   uuid primary key default gen_random_uuid(),
  email                text not null unique,
  phone_e164           text,
  full_name            text,
  rootedness           rootedness_t,        -- pregunta opcional del agradecimiento
  zones                text[] not null default '{}',
  source               text,
  referral_code        text,
  city                 text default 'Caracas',
  converted_profile_id uuid references profiles(id),
  created_at           timestamptz not null default now()
);

create index on waitlist (created_at desc);

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
-- 14. TRIGGERS
-- =====================================================================

create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_profiles_touch before update on profiles
for each row execute function touch_updated_at();

create trigger trg_payment_accounts_touch before update on payment_accounts
for each row execute function touch_updated_at();

-- Al publicar mesas, registrar los pares. Sostiene la regla de no repetir
-- en 6 meses sin que el matcher tenga que derivarla cada vez.
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
-- 15. VISTAS OPERATIVAS
-- =====================================================================

create or replace view v_matching_pool as
select b.event_id,
       b.id as booking_id,
       p.id as profile_id,
       pt.age, pt.gender, pt.rootedness, pt.industry,
       coalesce(ea.canonical, pt.employer_normalized) as employer_key,
       pt.life_stage, pt.social_energy, pt.intention, pt.romantic_openness,
       pt.dining_focus, pt.budget_tier,
       pt.interests, pt.conversation_topics, pt.dealbreakers,
       pt.dietary, pt.languages, pt.zones
from bookings b
join profiles p on p.id = b.profile_id
join profile_traits pt on pt.profile_id = p.id
left join employer_aliases ea on ea.alias = pt.employer_normalized
where b.status = 'confirmed'
  and p.status = 'active'
  and exists (select 1 from v_verified_profiles vp where vp.id = p.id);

-- Metrica que decide todo. Lleva el arraigo porque quien vive fuera y vino
-- de visita NO va a volver a los 60 dias, y eso no es un fallo de retencion:
-- es lo esperado. El numero de titular debe excluirlos o miente.
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
       (p.rootedness = 'visiting') as is_transient,
       s.first_at,
       s.second_at,
       (s.second_at is not null and s.second_at <= s.first_at + interval '60 days')
         as returned_60d
from seconds s
join profiles p on p.id = s.profile_id;

-- Varianza de NPS entre mesas del mismo evento: mismo restaurante, misma
-- noche, distinta mesa. Toda la diferencia viene del emparejamiento.
create or replace view v_matching_signal as
with per_table as (
  select dt.event_id, dt.id as table_id, avg(tf.nps) as nps_avg
  from dinner_tables dt
  join table_feedback tf on tf.table_id = dt.id
  group by dt.event_id, dt.id
)
select e.id as event_id,
       e.starts_at,
       count(pt.table_id) as tables_count,
       round(avg(pt.nps_avg)::numeric, 2) as avg_nps,
       round(stddev_pop(pt.nps_avg)::numeric, 3) as between_table_stddev
from events e
join per_table pt on pt.event_id = e.id
group by e.id, e.starts_at;


-- =====================================================================
-- 16. ROW LEVEL SECURITY
-- RLS activo en todo. El service_role del backend lo salta.
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
alter table dinner_tables     enable row level security;
alter table incident_reports  enable row level security;
alter table exclusions        enable row level security;
alter table waitlist          enable row level security;
alter table employer_aliases  enable row level security;
alter table payment_accounts  enable row level security;
alter table ops_audit_log     enable row level security;

-- Catalogos de lectura publica para usuarios autenticados
alter table zones                  enable row level security;
alter table restaurants            enable row level security;
alter table events                 enable row level security;
alter table products               enable row level security;
alter table questions              enable row level security;
alter table questionnaire_versions enable row level security;
alter table fx_rates               enable row level security;

create policy zones_read on zones for select using (true);
create policy products_read on products for select using (is_active);
create policy questionnaire_read on questionnaire_versions for select using (true);
create policy questions_read on questions for select using (true);
create policy fx_read on fx_rates for select using (true);
create policy events_read on events for select using (status <> 'draft' or is_ops());
create policy restaurants_read on restaurants for select using (is_active or is_ops());
create policy payment_accounts_read on payment_accounts for select using (is_active or is_ops());

-- Datos propios
create policy own_profile_read on profiles for select using (auth.uid() = id or is_ops());
create policy own_profile_update on profiles for update using (auth.uid() = id);
create policy own_answers on answers for all using (auth.uid() = profile_id or is_ops());
create policy own_traits on profile_traits for select using (auth.uid() = profile_id or is_ops());
create policy own_verifications on verifications
  for select using (auth.uid() = profile_id or is_ops());
create policy own_bookings on bookings for all using (auth.uid() = profile_id or is_ops());
create policy own_payments on payments for select using (auth.uid() = profile_id or is_ops());
create policy own_credits on credit_ledger for select using (auth.uid() = profile_id or is_ops());
create policy own_memberships on memberships for select using (auth.uid() = profile_id or is_ops());
create policy own_exclusions on exclusions
  for select using (auth.uid() in (profile_a, profile_b) or is_ops());
create policy own_incident_reports on incident_reports
  for select using (auth.uid() = reporter_id or is_ops());

-- El feedback persona a persona NUNCA es legible por el valorado.
-- Ni siquiera operaciones lo lee por esta via: para conducta usa la bandera.
create policy peer_feedback_writer_only on peer_feedback
  for select using (auth.uid() = rater_id);
create policy peer_feedback_insert on peer_feedback
  for insert with check (auth.uid() = rater_id);

create policy own_table_feedback on table_feedback
  for all using (auth.uid() = profile_id or is_ops());

-- Los companeros de mesa solo son visibles tras la revelacion.
create policy tablemates_after_reveal on table_members
  for select using (
    is_ops() or exists (
      select 1
      from dinner_tables dt
      join events e on e.id = dt.event_id
      join table_members me on me.table_id = dt.id
      where dt.id = table_members.table_id
        and me.profile_id = auth.uid()
        and now() >= e.reveal_at
    )
  );

create policy dinner_tables_after_reveal on dinner_tables
  for select using (
    is_ops() or exists (
      select 1 from table_members me
      join events e on e.id = dinner_tables.event_id
      where me.table_id = dinner_tables.id
        and me.profile_id = auth.uid()
        and now() >= e.reveal_at
    )
  );

-- Solo operaciones
create policy ops_only_aliases on employer_aliases for select using (is_ops());
create policy ops_only_audit on ops_audit_log for select using (is_ops());
create policy waitlist_ops_read on waitlist for select using (is_ops());
