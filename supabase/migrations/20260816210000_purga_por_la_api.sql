-- La purga no puede hacerse desde SQL.
--
-- `purgar_documentos_verificacion()` borraba de `storage.objects` con un
-- DELETE, y Supabase lo prohíbe:
--
--   42501 · Direct deletion from storage tables is not allowed.
--           Use the Storage API instead.
--   hint  · This prevents accidental data loss from orphaned objects.
--
-- Y tienen razón: borrar la fila de `storage.objects` dejaría el fichero
-- huérfano en el almacenamiento. O sea que la función no solo no corría —no
-- la llamaba nadie— es que no habría funcionado el día que alguien la
-- llamara. Se descubre ejecutándola, no leyéndola.
--
-- Así que la función se va y el trabajo se hace donde sí se puede: en
-- `/api/cron/purga`, que pide los ficheros a borrar, los borra con la API de
-- almacenamiento y después vacía `storage_path`. En ese orden: si el borrado
-- del fichero falla, la fila conserva la ruta y el intento siguiente vuelve a
-- por él. Al revés perderíamos la pista del fichero con el fichero todavía
-- ahí, que es exactamente el huérfano que Supabase intenta evitar.
drop function if exists purgar_documentos_verificacion();

-- Qué hay que borrar. Solo lee: decidir es de la base, borrar es de la API.
create or replace function documentos_a_purgar()
returns table (id uuid, storage_path text)
language sql
stable
security definer
set search_path = public
as $$
  select v.id, v.storage_path
  from verifications v
  where v.status in ('approved', 'rejected', 'expired')
    and v.storage_path is not null
    -- Para lo que nunca se revisó —una caducada, que se sustituye sin que
    -- nadie la mire— el reloj cuenta desde que se subió.
    and coalesce(v.reviewed_at, v.created_at) < now() - interval '90 days'
$$;

comment on function documentos_a_purgar is
  'Las verificaciones de más de 90 días que todavía tienen fichero: '
  'aprobadas, rechazadas y caducadas. Las borra /api/cron/purga con la API '
  'de almacenamiento; desde SQL no se puede.';
