-- `movida_por` ya no es siempre una cuenta de operación.
--
-- Desde el 29-10 la propia persona puede cambiarse de fecha desde Mi cena
-- (`/api/mi-mesa/cambiar-fecha`), y ahí lo que se guarda es su propio id.
-- El comentario decía «Qué cuenta de operación la movió» y a partir de ese
-- día dejó de ser verdad: quien lo leyera buscando al responsable de un
-- cambio concluiría que alguien de operación tocó una reserva que movió su
-- dueña.
--
-- Y de paso queda escrito cómo se distinguen los dos casos, que es lo que
-- de verdad hace falta saber al mirar una fila: si `movida_por` es igual a
-- `profile_id`, se movió ella. Si es otro id, fue operación.
--
-- Solo cambia el comentario. Ni datos ni estructura.

comment on column bookings.movida_por is
  'Quién movió la reserva de fecha: una cuenta de operación, o la propia '
  'persona desde Mi cena, y entonces es igual a profile_id.';
