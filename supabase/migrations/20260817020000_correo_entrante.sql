-- Las respuestas de la gente.
--
-- Hasta ahora el correo iba en una sola dirección: mandábamos y no había
-- vuelta. Pero `hola@aro.club` va en el pie de las trece plantillas, así que
-- alguien va a contestar —«no puedo el jueves», «¿dónde queda eso?»— y ese
-- mensaje tiene que llegar a algún sitio.
--
-- Se guarda ADEMÁS de reenviarlo al buzón de siempre, y por dos razones:
--
--   Que no se pierda. Si el reenvío falla —Resend caído, la cuenta al
--   límite—, el mensaje ya está escrito aquí. Un correo que se evapora es
--   peor que uno que rebota, porque nadie se entera.
--
--   Y porque una respuesta es información de operación. Quien contesta al
--   correo de su mesa está diciendo algo sobre esa mesa, y hoy eso vive en
--   una bandeja personal donde el resto del equipo no lo ve.
create table if not exists correos_entrantes (
  id            uuid primary key default gen_random_uuid(),

  -- Lo que dice el mensaje.
  de            text not null,
  para          text,
  asunto        text,
  texto         text,
  html          text,

  -- A quién corresponde, si lo sabemos. Se resuelve por la dirección de
  -- quien escribe: si es de un miembro, su respuesta queda atada a él.
  profile_id    uuid references profiles(id) on delete set null,

  -- El identificador de Resend, para no guardar dos veces el mismo si
  -- reintenta el webhook.
  proveedor_id  text unique,

  -- El cuerpo entero tal como llegó. Es el seguro: si mañana hace falta un
  -- campo que hoy no extraemos —una cabecera, un adjunto— está aquí, y no
  -- hay que pedirle a nadie que vuelva a escribir.
  crudo         jsonb not null,

  -- Cuándo se reenvió al buzón. Nulo = todavía no, y se puede reintentar.
  reenviado_at  timestamptz,
  error_reenvio text,

  -- Y si alguien de operación ya lo miró.
  visto_at      timestamptz,
  visto_por     uuid references profiles(id) on delete set null,

  created_at    timestamptz not null default now()
);

create index if not exists correos_entrantes_sin_ver
  on correos_entrantes (created_at desc)
  where visto_at is null;

create index if not exists correos_entrantes_por_perfil
  on correos_entrantes (profile_id, created_at desc);

-- Cerrado como todo lo demás: solo operación, y por la ruta de servidor.
alter table correos_entrantes enable row level security;

revoke all on correos_entrantes from anon, authenticated;

comment on table correos_entrantes is
  'Lo que la gente responde a hola@aro.club. Se guarda ANTES de reenviarlo: '
  'si el reenvío falla, el mensaje sigue aquí. `crudo` lleva el cuerpo entero '
  'tal como llegó, que es el seguro contra necesitar mañana un campo que hoy '
  'no extraemos.';
