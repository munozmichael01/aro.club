-- «Falta la cédula» y «falta la selfie»: dos motivos que no existían.
--
-- Michael, 13-10: «los casos que estoy viendo es que o falta la cédula o
-- falta la selfie y eso debe informarse tal cual, tanto en el motivo de
-- rechazo como en el correo».
--
-- Los seis motivos que había hablaban todos de una foto que SÍ llegó y no
-- servía —movida, vencida, borrosa—. Para la que no llegó no había ninguno,
-- así que quien revisaba tenía que elegir el que menos mintiera.
--
-- `afecta` es lo que hace que el correo diga la verdad: desde hoy la
-- plantilla pinta el titular, el botón, la fila de la otra foto y el consejo
-- según esta columna. Antes daba por hecho que la mala era la cédula, y al
-- rechazar una selfie decía al revés dos veces.
--
-- Los dos admiten reintento, claro: no llegar no es sospechoso.
insert into verification_rejection_reasons (code, label, message, allows_retry, sort_order, afecta)
values
  ('falta-cedula', 'Falta la foto del documento',
   'Nos llegó tu selfie, pero no la foto de tu documento. Sube tu cédula o pasaporte y lo revisamos el mismo día.',
   true, 5, 'id_document'),
  ('falta-selfie', 'Falta la selfie',
   'Nos llegó tu documento, pero no tu selfie. Hazte una de frente, con luz natural, y lo revisamos el mismo día.',
   true, 6, 'selfie')
on conflict (code) do update
  set label = excluded.label,
      message = excluded.message,
      allows_retry = excluded.allows_retry,
      sort_order = excluded.sort_order,
      afecta = excluded.afecta;
