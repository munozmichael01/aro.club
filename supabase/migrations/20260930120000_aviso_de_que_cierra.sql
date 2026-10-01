-- «Esta fecha se cierra mañana».
--
-- El hueco: alguien verificado, con una fecha abierta en su zona, que no
-- reservó. Nadie le dice nada antes de que cierre. `abrimos_zona` se manda
-- cuando la fecha SE ABRE —que suele ser dos semanas antes, cuando aún no es
-- decisión de nadie— y después silencio hasta que ya no se puede reservar.
--
-- Lo que se pierde ahí es un puesto vacío en una mesa que se arma con cinco.
--
-- Se manda UNA vez por persona y fecha, así que entra en el índice de los que
-- anuncian, junto a `abrimos_zona`, `recordatorio` y `fecha_cancelada`.
--
-- NO estrena preferencia: usa la misma que «abrimos mesa en tu zona». Quien
-- apagó «avísame cuando abra una fecha donde puedo llegar» tampoco quiere que
-- le recuerden esa misma fecha, y una casilla más en la pantalla de avisos
-- para una variante del mismo aviso es pedirle que afine algo que no quiere
-- afinar.

alter type email_kind_t add value if not exists 'cierra_pronto';
