-- El registro del aviso de retraso.
--
-- Tabla propia y NO `incident_reports`: eso es para cuando alguien se porta
-- mal, y avisar de que vienes tarde es exactamente lo contrario —es la
-- persona haciendo lo correcto—. Guardarlo ahí le dejaría una marca en su
-- ficha por haber sido considerada.
--
-- Uno por persona y mesa: el aviso se manda una vez. La pantalla no ofrece
-- corregirlo después, así que el servidor tampoco lo finge.

create table if not exists late_notices (
  id          uuid primary key default gen_random_uuid(),
  table_id    uuid not null references dinner_tables(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  -- Los tres que ofrece la pantalla hoy: 10, 20 y 30. El rango es más ancho
  -- a propósito, para no tener que migrar si mañana ofrece «una hora».
  minutes     int not null check (minutes between 5 and 120),
  created_at  timestamptz not null default now(),
  unique (table_id, profile_id)
);

create index if not exists late_notices_table_idx on late_notices (table_id);

alter table late_notices enable row level security;

comment on table late_notices is
  'Quien aviso de que llega tarde, y cuanto. Lo escribe /api/mi-mesa/tarde '
  'con la llave de servicio; nadie lo lee desde el navegador.';
