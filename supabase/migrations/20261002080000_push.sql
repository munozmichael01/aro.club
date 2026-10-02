-- Las notificaciones push: dónde viven los teléfonos y cuándo se mandó cada una.
--
-- NO hay cola nueva. El aviso de que algo pasó ya se anota en
-- `scheduled_emails` —con su destinatario, su tipo, su fecha y su `send_at`—
-- y una segunda tabla en paralelo serían dos ideas de cuándo se avisa a
-- alguien, que es exactamente la clase de duplicado que ya costó caro aquí
-- con el precio y con las horas de cierre. La push viaja en la misma fila:
-- dos columnas dicen si salió y por qué no.
--
-- Eso además hereda gratis lo que costó construir: el índice de «uno por
-- persona y fecha», las preferencias que ya se miraron al encolar, y los
-- imprescindibles que se mandan aunque la persona esté de baja.

create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  -- Único: un teléfono es un token. Si ese mismo teléfono entra con otra
  -- cuenta, la fila se MUEVE —`on conflict (token) do update`— en vez de
  -- duplicarse. Si no, la cuenta vieja seguiría recibiendo las push de un
  -- teléfono que ya no es suyo, que es una fuga de datos con forma de aviso.
  token text not null unique,
  plataforma text not null check (plataforma in ('ios', 'android')),
  version text,
  creado_en timestamptz not null default now(),
  -- Cuándo se vio por última vez. La app lo reenvía al arrancar si cambió o
  -- si pasó una semana, así que un token sin tocar en mucho tiempo es un
  -- teléfono que ya no abre la app.
  visto_en timestamptz not null default now(),
  -- Dado de baja. No se borra la fila: saber que un token murió —y cuándo—
  -- es lo que explica que a alguien dejaran de llegarle las push.
  baja_en timestamptz
);

-- Los vivos de una persona, que es la única consulta que hace el envío.
create index if not exists push_tokens_perfil_vivo
  on push_tokens (profile_id) where baja_en is null;

alter table push_tokens enable row level security;

-- Nadie los lee desde el navegador: se escriben y se leen con la clave de
-- servicio, desde `/api/push/token` y desde el cron. Sin política, RLS los
-- deja fuera del alcance de cualquier cliente, que es lo que se quiere.

alter table scheduled_emails
  -- Cuándo salió la push de esta fila. `null` y `push_motivo` null = todavía
  -- no se ha intentado.
  add column if not exists push_at timestamptz,
  -- Por qué no salió, cuando no salió: 'sin_token', 'sin_copy', 'error' o el
  -- motivo que devuelva Expo. Sin esto, «no me llegó la push» no se puede
  -- contestar.
  add column if not exists push_motivo text;

comment on column scheduled_emails.push_at is
  'Cuando se mando la push de esta fila. La cola es la misma que la del correo: un solo send_at y un solo indice de uno-por-persona-y-fecha.';
