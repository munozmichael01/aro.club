-- =====================================================================
-- Traspaso a movil por QR (solo escritorio).
--
-- Quien esta en el ordenador no tiene camara util para una cedula. El QR
-- lleva su verificacion al telefono sin pedirle que inicie sesion ahi.
--
-- El codigo es una llave temporal, asi que:
--   - solo sirve para SUBIR fotos de verificacion. No abre sesion, no lee
--     nada, no toca la cuenta.
--   - diez minutos.
--   - se muere en cuanto llegan las dos fotos.
--   - se guarda el hash, no el codigo. Quien lea la tabla no puede usarlo.
-- =====================================================================

create table if not exists verification_handoffs (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  -- sha256 del codigo. El codigo solo existe en el QR de la pantalla.
  token_hash  text not null unique,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  claimed_at  timestamptz,
  consumed_at timestamptz
);

create index if not exists verification_handoffs_perfil
  on verification_handoffs (profile_id, expires_at desc);

alter table verification_handoffs enable row level security;
-- Sin politicas: solo la clave de servicio entra. Un traspaso legible desde
-- el navegador seria un traspaso robable desde el navegador.

-- Los caducados no se acumulan: nadie los mira y son llaves.
create or replace function limpiar_traspasos()
returns void
language sql
security definer
set search_path = public
as $$
  delete from verification_handoffs
  where expires_at < now() - interval '1 day';
$$;
