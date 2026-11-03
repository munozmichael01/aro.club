-- El aviso del segundo acto (entrega segundo-acto de Design, 03-11).
--
-- A la hora del bar —dos horas después de la de la fecha— sale una push con
-- el bar y la distancia, y un correo SOLO para quien no la recibió en un
-- teléfono vivo. Viaja en `scheduled_emails` como todos; lo encola `publicar`
-- con su `send_at`, igual que la push del juego.
--
-- El valor del enum va solo en esta migración: un valor nuevo no se puede
-- usar en la misma transacción que lo crea, y el índice de la siguiente lo
-- nombra.

alter type email_kind_t add value if not exists 'segundo_acto';
