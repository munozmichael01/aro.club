-- =====================================================================
-- Verificacion de identidad: donde viven las fotos y quien puede verlas.
--
-- La pantalla prometia cuatro cosas y ninguna estaba montada:
-- "cifrado en nuestros servidores", "solo una persona de operacion",
-- "ni los otros cinco ni el restaurante", "se borra a los 90 dias".
-- Un bucket publico convertiria las cuatro en mentira.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verificaciones', 'verificaciones', false, 8388608,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Nadie lee este bucket desde el navegador. Ni su dueño: la persona sube
-- su cedula y a partir de ahi no vuelve a verla, y operacion la mira con
-- una URL firmada que caduca. Sin politica de select, no hay lectura
-- posible con la clave publica.
drop policy if exists verificaciones_sin_lectura on storage.objects;

-- La subida tampoco va por aqui: pasa por /api/verificacion con la clave
-- de servicio, que es quien decide el nombre del fichero. Si el navegador
-- pudiera elegir la ruta, podria escribir sobre la de otra persona.

alter table verifications
  -- El catalogo de motivos existia pero la columna guardaba texto libre.
  add column if not exists rejection_reason text references verification_rejection_reasons(code);

-- Una verificacion viva por tipo y persona. Reintentar sustituye, no
-- acumula: si no, la cola de operacion se llena de intentos viejos y
-- `aprobadas` de Mi cuenta acabaria mirando el equivocado.
create unique index if not exists verifications_una_viva
  on verifications (profile_id, kind)
  where status in ('pending', 'approved');

-- ---------------------------------------------------------------------
-- Los 90 dias. Se borra el FICHERO; la fila se queda sin ruta, porque la
-- marca de que la verificacion ocurrio es justo lo que hay que conservar.
-- ---------------------------------------------------------------------
create or replace function purgar_documentos_verificacion()
returns table (borradas int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
begin
  with viejas as (
    select storage_path from verifications
    where status = 'approved'
      and storage_path is not null
      and reviewed_at < now() - interval '90 days'
  )
  delete from storage.objects
  where bucket_id = 'verificaciones'
    and name in (select storage_path from viejas);

  update verifications
     set storage_path = null
   where status = 'approved'
     and storage_path is not null
     and reviewed_at < now() - interval '90 days';

  get diagnostics v_n = row_count;
  return query select v_n;
end $$;

-- ---------------------------------------------------------------------
-- La cola de operacion. Sale de aqui y no de la pantalla: quien lleva mas
-- tiempo esperando va primero, y eso no puede depender de como ordene el
-- navegador.
-- ---------------------------------------------------------------------
create or replace view v_cola_verificacion as
select
  p.id                        as profile_id,
  p.full_name,
  p.display_name,
  p.birthdate,
  p.gender,
  p.email,
  min(v.created_at)           as espera_desde,
  count(*) filter (where v.kind = 'id_document' and v.status = 'pending') as doc_pendiente,
  count(*) filter (where v.kind = 'selfie'      and v.status = 'pending') as selfie_pendiente,
  -- Cuantas veces ha reintentado. Cinco intentos con documentos distintos
  -- no es mala suerte con la camara.
  (select count(*) from verifications vr
    where vr.profile_id = p.id and vr.status = 'rejected') as rechazos_previos
from verifications v
join profiles p on p.id = v.profile_id
where v.status = 'pending'
group by p.id, p.full_name, p.display_name, p.birthdate, p.gender, p.email;

alter view v_cola_verificacion set (security_invoker = on);
