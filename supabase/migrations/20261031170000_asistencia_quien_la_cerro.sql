-- Quién decidió que alguien vino: una persona o la encuesta.
--
-- Michael, 31-10: la encuesta no se cierra nunca —se contesta cuando se
-- contesta— pero la asistencia sí se cerraba a los tres días, y entonces una
-- respuesta del quinto día ya no cambiaba nada. Lo que faltaba para poder
-- arreglarlo es saber de dónde salió cada marca: lo que puso una persona no
-- se toca jamás, y lo que puso el automático sí puede corregirse con lo que
-- llegue después.
--
-- Nulo es «nadie lo ha decidido todavía», que es el estado de siempre.

alter table bookings
  add column if not exists asistencia_por text
    check (asistencia_por in ('operacion', 'encuesta'));

comment on column bookings.asistencia_por is
  'Quién marcó la asistencia: `operacion` si lo puso una persona en el panel '
  'y `encuesta` si lo cerró el automático con las respuestas de la mesa. '
  'Nulo mientras nadie lo decide. Lo de operación no lo pisa nada.';
