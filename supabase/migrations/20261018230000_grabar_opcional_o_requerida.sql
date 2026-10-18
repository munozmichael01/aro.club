-- Grabar puede ser OPCIONAL o REQUERIDA, en los dos niveles.
--
-- Michael, 18-10: «me parece que los niveles están ok, pero la regla debería
-- ser que ambas se puedan marcar como opcionales o requeridas, y ahí sí entra
-- la condición para poder reservar o no».
--
-- O sea que lo que decide si el permiso es condición NO es la altura —fecha o
-- mesa— sino si está marcada como requerida. Esta mañana lo até a la altura y
-- era una regla de menos: una fecha puede grabarse «si sale» sin cerrarle la
-- puerta a quien no quiera salir, y una mesa concreta puede ser justo la que
-- se graba seguro.
--
-- Queda así:
--
--   grabacion = false                      → no se graba. Nada que preguntar.
--   grabacion = true,  requerida = false   → OPCIONAL. Se pregunta al revelar
--                                            la mesa y no bloquea reservar.
--   grabacion = true,  requerida = true    → REQUERIDA. En una fecha, el
--                                            permiso es condición para
--                                            apartar puesto. En una mesa, es
--                                            lo que operación mira antes de
--                                            sentar ahí a quien dijo que no.
--
-- Las que ya estaban marcadas se quedan OPCIONALES, que es lo que eran
-- cuando se marcaron: nadie dio permiso bajo una condición que no existía.

alter table events
  add column if not exists grabacion_requerida boolean not null default false;

alter table dinner_tables
  add column if not exists grabacion_requerida boolean not null default false;

comment on column events.grabacion_requerida is
  'Si el permiso de grabacion es CONDICION para apartar puesto en esta fecha. '
  'Solo cuenta cuando `grabacion` esta encendida. Lo marca operacion.';

comment on column dinner_tables.grabacion_requerida is
  'Si en esta mesa se graba seguro. No bloquea reservar —la mesa se arma '
  'despues— : es lo que operacion mira para no sentar ahi a quien dijo que no.';
