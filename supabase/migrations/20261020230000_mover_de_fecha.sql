-- Mover a alguien de una fecha a otra, desde el panel.
--
-- Michael, 20-10: «mantenlo separado y en lugar de mezclar las mesas en la
-- fecha, me permites mover a alguien de fecha desde el panel, siguiendo
-- marcándolo con la etiqueta de la mesa original donde reservó».
--
-- El 17 pedimos lo contrario —juntar las mesas del día en una pantalla— y no
-- resolvía lo que hacía falta: juntarlas deja ver a los dos grupos, pero el
-- reparto mueve gente ENTRE MESAS de una fecha y nunca entre fechas, porque
-- la reserva, el pago y los correos son de una fecha concreta. El jueves 22
-- hay dos cenas esa noche, una abierta con dos apuntados y una de +40 con
-- ocho, y la única salida que había era cancelar la fecha corta.
--
-- Mover es cambiar `bookings.event_id`, y eso borra de dónde venía. Estas
-- tres columnas lo conservan: la etiqueta que pidió Michael sale de
-- `movida_de`, y las otras dos contestan quién lo hizo y cuándo el día que
-- alguien pregunte por qué cenó donde cenó.
alter table bookings
  add column if not exists movida_de  uuid references events(id) on delete set null,
  add column if not exists movida_at  timestamptz,
  add column if not exists movida_por uuid references profiles(id) on delete set null;

comment on column bookings.movida_de is
  'La fecha en la que esta persona reservó, si operación la movió a otra. '
  'Nulo = reservó donde está. Se conserva para poder decirlo en el panel.';

comment on column bookings.movida_at is 'Cuándo se movió.';
comment on column bookings.movida_por is 'Qué cuenta de operación la movió.';
