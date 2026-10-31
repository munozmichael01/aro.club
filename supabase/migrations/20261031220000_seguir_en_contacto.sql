-- «Seguir en contacto»: lo que pasa cuando dos personas de una mesa se marcan.
--
-- Entrega seguir-en-contacto de Design, con los cambios de Michael del 31-10
-- (app-mobile/Design/BRIEF-mi-mesa-pasadas.md). La marca vive en
-- `peer_feedback` con la señal `connect` desde el 29-10; lo que faltaba es lo
-- que viene después: que dos marcas mutuas sean una COINCIDENCIA con su
-- plazo, que cada persona elija qué compartir, y que se compartan solo si las
-- dos personas confirman.
--
-- Una marca sola no crea nada aquí. Sin coincidencia nadie se entera jamás
-- de que alguien marcó a alguien: es la regla del 29-10 y esta tabla no la
-- toca, porque solo nace de dos marcas.

-- Una fila por pareja y mesa. `persona_a` < `persona_b` para que la misma
-- pareja no pueda estar dos veces con el orden cambiado.
create table if not exists contacto_coincidencias (
  id          uuid primary key default gen_random_uuid(),
  table_id    uuid not null references dinner_tables(id) on delete cascade,
  persona_a   uuid not null references profiles(id) on delete cascade,
  persona_b   uuid not null references profiles(id) on delete cascade,
  creada_en   timestamptz not null default now(),
  -- 7 días desde la coincidencia (Michael, 31-10).
  cierra_en   timestamptz not null,
  -- Lo que decidió cada una. `no` es «prefiero no» o haberla desmarcado: no
  -- se le dice a nadie, y mientras dure el plazo se puede deshacer.
  estado_a    text not null default 'pendiente' check (estado_a in ('pendiente', 'confirmado', 'no')),
  estado_b    text not null default 'pendiente' check (estado_b in ('pendiente', 'confirmado', 'no')),
  -- Las dos personas confirmaron: desde aquí cada una ve lo que dejó la otra.
  cruzada_en  timestamptz,
  -- Se pasó el plazo sin cruce. Lo escribe el cron, que es quien manda el
  -- «No se cruzaron» a quien había confirmado.
  cerrada_en  timestamptz,
  -- Hasta cuándo vio cada una lo que hay: «hay algo nuevo» es un cambio
  -- (coincidencia, cruce o cierre) posterior a esto.
  visto_a_en  timestamptz,
  visto_b_en  timestamptz,
  unique (table_id, persona_a, persona_b),
  check (persona_a < persona_b)
);

create index if not exists contacto_coincidencias_a on contacto_coincidencias (persona_a);
create index if not exists contacto_coincidencias_b on contacto_coincidencias (persona_b);
create index if not exists contacto_coincidencias_abiertas on contacto_coincidencias (cierra_en)
  where cruzada_en is null and cerrada_en is null;

comment on table contacto_coincidencias is
  'Dos personas de una mesa que se marcaron para seguir en contacto. Nace solo '
  'de dos marcas `connect` mutuas. El estado de cada una decide qué se comparte; '
  'nada sale si no confirman las dos personas.';

-- Lo que cada persona comparte de ESA cena. Una vez por cena y no por pareja:
-- con varias coincidencias se llena una sola vez (entrega, «varias»).
create table if not exists contacto_datos (
  table_id       uuid not null references dinner_tables(id) on delete cascade,
  profile_id     uuid not null references profiles(id) on delete cascade,
  -- El número va siempre, en E.164. Sale del perfil y se puede cambiar.
  telefono       text not null,
  instagram      text,
  tiktok         text,
  actualizado_en timestamptz not null default now(),
  primary key (table_id, profile_id)
);

comment on table contacto_datos is
  'Lo que una persona deja para seguir en contacto después de una cena. Solo '
  'lo ve la otra persona de una coincidencia cruzada.';

-- Datos de contacto de miembros: nadie los lee desde el navegador. Sin
-- políticas, RLS deniega todo y solo entra la llave de servicio.
alter table contacto_coincidencias enable row level security;
alter table contacto_datos enable row level security;

-- Los tres avisos del flujo.
alter type email_kind_t add value if not exists 'contacto_coincidencia';
alter type email_kind_t add value if not exists 'contacto_cruzado';
alter type email_kind_t add value if not exists 'contacto_sin_cruce';
