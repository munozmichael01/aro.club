-- La push del juego también es «una por persona y fecha».
--
-- EL FALLO. `publicar` encola la push del juego con un `upsert` cuyo
-- `onConflict` es `(profile_id, kind, event_id)`. Ese índice es PARCIAL —solo
-- cubre los tipos que anuncian algo una vez— y `juego` no estaba en la lista,
-- así que Postgres rechazaba la sentencia entera: no hay índice único que
-- case con ese ON CONFLICT. El `upsert` no es un detalle de estilo, es lo que
-- impide que republicar una mesa deje dos avisos en el mismo teléfono.
--
-- Y no se veía. El error del juego se escribe en el registro y se sigue
-- adelante a propósito —«las mesas ya están puestas y el aviso del juego es
-- lo último que debe impedir que alguien sepa dónde cena»—, así que publicar
-- devolvía 200, el panel decía PUBLICADA y la cola se quedaba con los correos
-- de la mesa y CERO filas de juego. El juego se construyó entero, se desplegó
-- y nunca avisó a nadie: la mitad de la función llevaba días muerta sin una
-- sola señal.
--
-- Lo encontró una mesa de prueba montada para jugarlo, que es el único sitio
-- donde se podía ver: seis sentados, seis correos encolados, ninguna push.
--
-- POR QUÉ ENTRA EN EL ÍNDICE Y NO SE QUITA EL `upsert`. «¿Ya pidieron?» se
-- manda una vez por mesa y por persona. Republicar una mesa —cambiar a
-- alguien de sitio una hora antes— no es una segunda cena: es la misma, y el
-- teléfono no tiene por qué vibrar dos veces con la misma pregunta. Esa es
-- exactamente la regla que el índice ya sostiene para los otros cuatro.
--
-- `cierra_pronto` entró aquí por lo mismo en su día, y por el mismo camino:
-- el tipo nuevo se añadió al enum y nadie lo añadió al índice.

drop index if exists scheduled_emails_una_por_persona;

create unique index scheduled_emails_una_por_persona
  on scheduled_emails (profile_id, kind, event_id)
  where kind in ('abrimos_zona', 'recordatorio', 'fecha_cancelada', 'cierra_pronto', 'juego');

comment on index scheduled_emails_una_por_persona is
  'Solo los avisos que ANUNCIAN algo una vez, correo o push. Los que acusan '
  'una accion —cancelar, pagar, que te asignen mesa— se pueden repetir sobre '
  'la misma fecha, porque la accion se puede repetir. Un tipo nuevo que se '
  'encole con `upsert` sobre (profile_id, kind, event_id) TIENE que entrar '
  'aqui: si no, la sentencia falla entera y, si quien la llama solo registra '
  'el error, no se entera nadie.';
