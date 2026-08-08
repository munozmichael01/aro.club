-- =====================================================================
-- La propuesta del reparto y los correos programados.
--
-- El reparto propone y una persona confirma, asi que la propuesta tiene
-- que vivir en algun sitio ANTES de existir las mesas. No se materializa
-- en table_members al proponer porque su trigger registra los pares en
-- pair_encounters: dos personas figurarian como "ya se vieron" por una
-- cena que nadie confirmo.
-- =====================================================================

alter table matching_runs
  add column proposal jsonb,
  add column published_at timestamptz,
  add column published_by uuid references profiles(id);

comment on column matching_runs.proposal is
  'Las mesas propuestas, antes de confirmarse. Al publicar se materializan '
  'en dinner_tables y table_members.';

-- ---------------------------------------------------------------------
-- Correos programados
--
-- Al publicar, los correos NO salen: quedan programados para el jueves a
-- las 12:00 en punto. La revelacion es el producto; adelantarla lo rompe.
-- ---------------------------------------------------------------------

create type email_kind_t as enum (
  'bienvenida', 'verificacion', 'mesa_asignada', 'recordatorio', 'comprobante'
);

create table scheduled_emails (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  kind        email_kind_t not null,
  event_id    uuid references events(id) on delete cascade,
  send_at     timestamptz not null,
  sent_at     timestamptz,
  payload     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- La cola: lo que toca mandar ya y todavia no se mando.
create index scheduled_emails_pendientes
  on scheduled_emails (send_at) where sent_at is null;
create unique index scheduled_emails_una_por_persona
  on scheduled_emails (profile_id, kind, event_id) where event_id is not null;

alter table scheduled_emails enable row level security;
create policy correos_ops on scheduled_emails for select using (is_ops());

comment on table scheduled_emails is
  'Cola de correos. Se programan al publicar el reparto y salen a su hora, '
  'nunca antes: el de la mesa va el jueves a las 12:00 en punto.';
