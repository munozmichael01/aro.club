-- =====================================================================
-- El enlace de baja se gasta al usarse.
--
-- El token era una firma con caducidad de treinta días y nada más. Mientras
-- estuviera dentro de la ventana, servía tantas veces como se pulsara — y un
-- correo reenviado lleva el enlace dentro. Reenviar la bienvenida a un amigo
-- era darle un botón para darte de baja a ti.
--
-- La caducidad no arreglaba eso: solo ponía fecha al problema. Lo que hacía
-- falta es que el primer uso lo mate, que es justo lo que la pantalla ya
-- decía —«para que nadie pueda darte de baja desde un correo reenviado»—
-- desde la entrega 15. El texto iba por delante del código.
--
-- Aquí solo vive la huella del token gastado. No hay tabla de tokens vivos
-- porque no hace falta: la firma se comprueba sola, sin base. Esto es una
-- lista de los que ya no valen.
-- =====================================================================

create table if not exists bajas_correo_tokens (
  -- sha256 del token, no el token. Si mañana alguien lee esta tabla —una
  -- copia, un volcado, un log— se lleva huellas, no llaves. Es lo mismo que
  -- hace `verification_handoffs`.
  token_hash text primary key,

  -- Para poder mirar «¿de quién era este enlace?» sin deshacer el hash.
  correo     text not null,

  gastado_at timestamptz not null default now()
);

comment on table bajas_correo_tokens is
  'Enlaces de baja ya usados. Un token que está aquí no vuelve a valer: la '
  'inserción es lo que lo gasta, y su clave primaria es lo que hace que dos '
  'pulsaciones a la vez no puedan gastarlo dos veces.';

comment on column bajas_correo_tokens.token_hash is
  'sha256 del token del enlace. La firma se valida sin base; esto solo dice '
  'cuáles ya se usaron.';

create index if not exists bajas_correo_tokens_por_correo
  on bajas_correo_tokens (correo, gastado_at desc);

-- Cerrada: solo el servidor, igual que `bajas_correo`.
alter table bajas_correo_tokens enable row level security;
revoke all on bajas_correo_tokens from anon, authenticated;
