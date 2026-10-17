-- =====================================================================
-- Grabamos esta noche · el permiso de cada quien.
--
-- Michael, 17-10: «antes de enviar la revelacion, me gustaria avisarles que
-- es posible que hoy estemos por la zona grabando contenido». El correo
-- avisa y no guarda nada: quien conteste lo hace por correo o en la puerta,
-- y quien esta grabando no tiene forma de saber a quien no puede enfocar.
--
-- Dos columnas, y las dos hacen falta:
--
-- `events.grabacion` dice que ESA fecha se graba. Sin esto la pregunta
-- saldria en todas las cenas, y una pregunta que sale siempre deja de
-- leerse. La enciende operacion por fecha.
--
-- `bookings.permiso_grabacion` es la respuesta de una persona para una
-- cena, y es de tres estados a proposito: `null` es «no ha contestado», que
-- NO es un no. Tratar el silencio como permiso seria grabar a quien no dijo
-- nada, y tratarlo como negativa seria no poder grabar a nadie que no haya
-- abierto la pantalla. Quien graba necesita ver los tres.
--
-- Va en la reserva y no en el perfil porque el permiso es de esa noche: que
-- alguien no quisiera salir en camara en octubre no dice nada de diciembre,
-- y guardarlo en el perfil lo convertiria en una preferencia permanente que
-- nadie puso.
-- =====================================================================

alter table events
  add column if not exists grabacion boolean not null default false;

comment on column events.grabacion is
  'Esa noche grabamos contenido por la zona. Lo enciende operacion, y es lo '
  'que hace que Mi mesa pregunte el permiso. Por fecha y no global: una '
  'pregunta que sale siempre deja de leerse.';

alter table bookings
  add column if not exists permiso_grabacion boolean;

comment on column bookings.permiso_grabacion is
  'Si esta persona nos deja grabarla esa noche. null es «no ha contestado», '
  'que no es un no: el silencio no es permiso y tampoco es negativa. Se '
  'pregunta en Mi mesa despues de la revelacion y se puede cambiar ahi mismo.';
