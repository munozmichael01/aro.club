-- La cédula y la selfie pasan de 90 a 120 días.
--
-- Michael, 13-10: mientras arranca el club y todavía no hay historial de
-- comportamiento, poder volver a mirar quién era alguien vale más que el
-- ahorro de no guardarlo.
--
-- No es un cambio de configuración: es una promesa escrita en la pantalla de
-- verificación —justo antes de subir la foto— y en el legal. Las dos cambian
-- en el mismo despliegue que esta migración. Dejar el borrado en 120 y el
-- texto en 90 sería decir una cosa y hacer otra sobre documentos de
-- identidad, y eso no es un descuadre de copy.
--
-- El número vive en `AroReglas.DIAS_GUARDA_FOTOS`, que leen el servidor y las
-- pantallas. La base no puede leer ese fichero, así que tiene su copia aquí y
-- el comprobador vigila que digan lo mismo.
--
-- Nada se ha borrado nunca: la primera verificación se aprobó el 09-08, así
-- que el primer borrado tocaba el 07-11. Con 120 pasa al 07-12.
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
    and coalesce(v.reviewed_at, v.created_at) < now() - interval '120 days'
$$;

comment on function documentos_a_purgar is
  'Las verificaciones de más de 120 días que todavía tienen fichero: '
  'aprobadas, rechazadas y caducadas. Las borra /api/cron/purga con la API '
  'de almacenamiento; desde SQL no se puede. El plazo vive tambien en '
  'AroReglas.DIAS_GUARDA_FOTOS y los dos tienen que decir lo mismo.';
