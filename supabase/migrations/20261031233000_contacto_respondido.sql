-- Cuándo contestó una persona «¿seguir en contacto?» de una cena.
--
-- La pregunta existe desde el 29-10. Quien cenó antes contestó una encuesta
-- sin ella, y Michael decidió el 31-10 ofrecérsela SOLO dentro de Pasadas,
-- sin correo ni push: una tarjeta en esa cena. Para que la tarjeta se vaya al
-- contestarla hace falta saber que la contestó, también cuando no marca a
-- nadie, y «nadie» no deja ninguna fila en `peer_feedback`.
--
-- Nulo: no la ha contestado por separado (o la contestó dentro de la
-- encuesta, que ya la llevaba).

alter table table_feedback
  add column if not exists contacto_respondido_en timestamptz;

comment on column table_feedback.contacto_respondido_en is
  'Cuándo contestó «¿Te gustaría seguir en contacto con alguien de la mesa?» '
  'para esta cena, aunque no marcara a nadie. Quita la tarjeta de Pasadas.';

-- Y la columna de «Estás dentro», que cambió de regla el mismo día (Michael,
-- 31-10: se ve UNA vez, al reportar el pago, y al confirmarse no vuelve).
comment on column bookings.dentro_visto_en is
  'Cuándo vio «Estás dentro»: al reportar el pago o al confirmarse, lo que '
  'pase primero. Se ve una sola vez. Lo escribe POST /api/estas-dentro; lo '
  'leen Mi cuenta, Mi mesa y Pago.';
