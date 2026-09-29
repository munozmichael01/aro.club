-- El índice único se estaba tragando correos imprescindibles.
--
-- `scheduled_emails_una_por_persona` es `(profile_id, kind, event_id)`, sin
-- condición. Existe por una razón buena: que «abrimos tu zona» o el
-- recordatorio no salgan dos veces si el cron vuelve a pasar. Esos ANUNCIAN
-- algo, y anunciarlo dos veces es un fallo.
--
-- Pero hay otros que no anuncian: ACUSAN una acción que la persona acaba de
-- hacer, y esa acción se puede repetir sobre la misma fecha. Michael canceló,
-- volvió a reservar con el crédito devuelto —se reactivó la misma fila de
-- `bookings`— y canceló otra vez. El segundo correo de cancelación chocó con
-- el índice, `encolar` devolvió «repetido», y nadie se enteró: la pantalla
-- dijo que estaba cancelado y a él no le llegó nada.
--
-- Lo encontró el agente de la app probando la cancelación de punta a punta.
--
-- Por qué no basta con meter `booking_id` en el índice: una reserva se
-- REACTIVA. La misma fila sirvió para las dos cancelaciones, así que con
-- `booking_id` el choque sería idéntico.
--
-- Así que el índice pasa a valer solo para los que de verdad se anuncian una
-- vez. La lista es corta y explícita a propósito, como las demás de este
-- repo: lo que no esté aquí se puede repetir, y es lo correcto.
--
--   abrimos_zona     · se abre una zona una vez
--   recordatorio     · el del día de la cena, que manda el cron
--   fecha_cancelada  · una fecha se cancela una vez
--
-- Fuera quedan cancelación, los tres de pago, la mesa asignada, el puesto con
-- cupón, el aviso de retraso, «sin mesa» y «mesa cambiada»: todos contestan a
-- algo que se puede volver a hacer sobre la misma fecha.

drop index if exists scheduled_emails_una_por_persona;

create unique index scheduled_emails_una_por_persona
  on scheduled_emails (profile_id, kind, event_id)
  where kind in ('abrimos_zona', 'recordatorio', 'fecha_cancelada');

comment on index scheduled_emails_una_por_persona is
  'Solo los correos que ANUNCIAN algo una vez. Los que acusan una accion '
  '—cancelar, pagar, que te asignen mesa— se pueden repetir sobre la misma '
  'fecha, porque la accion se puede repetir.';
