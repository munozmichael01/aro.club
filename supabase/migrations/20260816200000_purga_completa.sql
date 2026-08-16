-- La purga de documentos, completa.
--
-- La función existía desde el 9 de agosto y borraba solo los APROBADOS, que
-- es literalmente lo que promete la pantalla: «se borra a los 90 días de
-- aprobarse». Pero deja fuera dos casos que son peores que el que cubre:
--
--   RECHAZADOS. Le dijimos que no y nos quedamos su cédula para siempre.
--   No es miembro, no obtuvo nada de nosotros, y su documento sigue en
--   nuestro bucket. Es el caso en el que menos derecho tenemos a guardarlo.
--
--   CADUCADOS. La foto que sustituyó otra foto. No es prueba de nada: es un
--   intento anterior que ya nadie va a mirar.
--
-- La regla es la misma en los tres y es la que ya estaba escrita: se borra
-- el FICHERO y se conserva la fila. La marca de que la verificación ocurrió
-- —y de que se rechazó, y por qué— es justo lo que hay que guardar; el
-- escaneo de una cédula no.
--
-- El reloj cuenta desde que se revisó, y para lo que nunca se revisó —una
-- caducada, que se sustituye sin revisar— desde que se subió.
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
    where status in ('approved', 'rejected', 'expired')
      and storage_path is not null
      and coalesce(reviewed_at, created_at) < now() - interval '90 days'
  )
  delete from storage.objects
  where bucket_id = 'verificaciones'
    and name in (select storage_path from viejas);

  update verifications
     set storage_path = null
   where status in ('approved', 'rejected', 'expired')
     and storage_path is not null
     and coalesce(reviewed_at, created_at) < now() - interval '90 days';

  get diagnostics v_n = row_count;
  return query select v_n;
end $$;

comment on function purgar_documentos_verificacion is
  'Borra el fichero de las verificaciones de más de 90 días —aprobadas, '
  'rechazadas y caducadas— y deja la fila. La llama /api/cron/purga todas '
  'las noches. Sin ese cron, la promesa de la pantalla no la cumple nadie.';
