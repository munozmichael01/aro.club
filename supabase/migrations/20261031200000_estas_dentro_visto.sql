-- Cuándo vio alguien «Estás dentro» con la reserva ya confirmada.
--
-- Entrega estas-dentro (29-10): la pantalla B se ve UNA vez, y la marca la
-- primera puerta que se use —la push, el botón del correo o la primera
-- apertura después de confirmar—. La app lo apuntaba en el teléfono y por la
-- hora de la fecha, y eso tuvo dos fallos que vio Michael (31-10):
--
--   · la marca se ponía ya al REPORTAR el pago, así que al confirmarse no
--     volvía a salir y solo aparecía tras pasar por «Ver mi mesa»;
--   · vivía en un teléfono: en la web, o en otro teléfono, no se sabía.
--
-- Aquí es del servidor y solo del momento confirmado. Lo de antes de
-- confirmar no se marca: es lo que hace que, al confirmarse, salga.
--
-- Nulo es «todavía no la ha visto». Con la reserva pendiente de pago no
-- significa nada.

alter table bookings
  add column if not exists dentro_visto_en timestamptz;

comment on column bookings.dentro_visto_en is
  'Cuándo vio «Estás dentro» con la reserva confirmada (entrega estas-dentro). '
  'Nulo: aún no. Lo escribe POST /api/estas-dentro; lo leen Mi cuenta, Mi mesa y '
  'Pago para abrirla una sola vez después de confirmar.';
