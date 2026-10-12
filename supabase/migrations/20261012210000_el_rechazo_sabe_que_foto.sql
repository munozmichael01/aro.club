-- Un rechazo dice QUÉ foto hay que repetir, y solo esa se rechaza.
--
-- El rechazo actualiza todas las filas pendientes de la persona:
--
--   .eq('profile_id', …).eq('status', 'pending')
--
-- Así que rechazar la cédula rechaza también la selfie. Y el correo que sale
-- dice lo contrario, con todas las letras: «Tu selfie — Guardada, no hace
-- falta repetirla». El código y la promesa decían cosas distintas.
--
-- Le pasó a Andrés hoy: se le rechazó el documento por `documento-no-valido`,
-- su selfie cayó con él, volvió a subir SOLO la cédula —que es lo que el
-- correo le pedía— y la cola se quedó diciendo «falta la selfie» sin que él
-- tenga forma de saberlo.
--
-- Los motivos ya decían a cuál se referían, en su propio texto: «vuelve a
-- hacer la foto del documento», «la selfie salió oscura». Lo que faltaba era
-- que el código pudiera leerlo. Ahora lo dice la columna.
--
-- `ambas` es para los dos que no son un problema de foto sino de identidad:
-- ahí no se repite nada —no permiten reintento— y lo que toca es escribir.

alter table verification_rejection_reasons
  add column if not exists afecta text not null default 'ambas'
  check (afecta in ('id_document', 'selfie', 'ambas'));

comment on column verification_rejection_reasons.afecta is
  'Que foto invalida este motivo. El rechazo solo marca esa: rechazar las dos '
  'cuando solo una esta mal obliga a repetir una foto que estaba bien, y '
  'contradice el correo, que promete que la otra se guarda.';

update verification_rejection_reasons set afecta = 'id_document'
 where code in ('foto-movida', 'documento-vencido', 'documento-no-valido');

update verification_rejection_reasons set afecta = 'selfie'
 where code = 'selfie-borrosa';

-- `no-coinciden` y `sospecha-suplantacion` se quedan en 'ambas': no es que
-- una foto esté mal, es que la identidad no se sostiene.
