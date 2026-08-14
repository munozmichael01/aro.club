-- Los cuatro correos de la entrega 13.
--
-- Design entregó doce plantillas, no ocho: las dos que le pedí —restablecer
-- la clave y el aviso de que abre una zona— más dos que faltaban y no había
-- señalado nadie.
--
--   verificacion_rechazada  Hasta ahora el rechazo iba con `verificacion` y
--                           un `resultado` en el payload. Son mensajes
--                           distintos: uno dice «ya puedes reservar» y el
--                           otro «repite esta foto». Con un solo tipo, el
--                           remitente tendría que mirar dentro del payload
--                           para elegir plantilla, y ahí es donde se manda
--                           el correcto al caso equivocado.
--
--   fecha_cancelada         La cancelamos NOSOTROS. No es lo mismo que
--                           `cancelacion`, que es la suya: en esta le
--                           devolvemos el crédito y le debemos una
--                           explicación.
--
--   restablecer_clave       Hoy el enlace se genera y se tira.
--   abrimos_zona            El interruptor del perfil que no dispara nada.

alter type email_kind_t add value if not exists 'verificacion_rechazada';
alter type email_kind_t add value if not exists 'fecha_cancelada';
alter type email_kind_t add value if not exists 'restablecer_clave';
alter type email_kind_t add value if not exists 'abrimos_zona';
