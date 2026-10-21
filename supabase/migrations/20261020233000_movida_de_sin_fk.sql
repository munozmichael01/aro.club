-- `movida_de` se queda sin clave foránea, a propósito.
--
-- La migración de hace un momento la creó apuntando a `events(id)`, y con eso
-- `bookings` pasó a tener DOS caminos hacia `events`: `event_id` y
-- `movida_de`. PostgREST no elige por ti: en cuanto hay dos, cualquier
-- consulta que traiga la fecha desde la reserva —`.select('events(...)')`—
-- deja de resolverse y pide que se le diga por cuál.
--
-- Lo cazó el compilador en `/api/mi-mesa`, que es la pantalla donde un
-- miembro ve con quién cena. O sea que la columna nueva, que solo sirve para
-- pintar una etiqueta en el panel, habría apagado Mi mesa para todo el mundo.
--
-- Dos salidas: ir a cada consulta y decirle el camino, o quitar la clave. Se
-- quita. Esta columna no manda nada: se lee para poner un rótulo y, si esa
-- fecha ya no existe, lo correcto es que no haya rótulo, no que se borre el
-- dato de la reserva. Y dejar la ambigüedad puesta es una trampa para la
-- próxima consulta que alguien escriba, que fallaría en producción y no aquí.
alter table bookings drop constraint if exists bookings_movida_de_fkey;

comment on column bookings.movida_de is
  'La fecha en la que esta persona reservó, si operación la movió a otra. '
  'Nulo = reservó donde está. SIN clave foránea a propósito: una segunda vía '
  'de bookings a events rompe los embeds de PostgREST (ver la migración '
  '20261020233000). Si la fecha ya no existe, no hay rótulo y ya está.';
