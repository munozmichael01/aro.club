-- =====================================================================
-- Los correos que faltan en el enum, y la cola que los recoge.
--
-- Hoy NO HAY REMITENTE: nada sale. Pero la cola es el registro de lo que
-- habria que mandar, y encolarlo ahora significa que el dia que exista el
-- remitente funciona sin volver a tocar el flujo.
--
-- El de `pago_no_cuadra` es el mas importante de los tres y es el unico
-- del que Design no tiene plantilla: el correo 06 le promete a la persona
-- "si no cuadra te escribimos", y ahora mismo esa promesa no se cumple.
-- =====================================================================

alter type email_kind_t add value if not exists 'pago_en_revision';
alter type email_kind_t add value if not exists 'pago_confirmado';
alter type email_kind_t add value if not exists 'pago_no_cuadra';
alter type email_kind_t add value if not exists 'cancelacion';
