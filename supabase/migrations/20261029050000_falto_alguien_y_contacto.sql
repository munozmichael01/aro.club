-- `peer_feedback` vuelve a tener dueño, y es el que se le reservó.
--
-- La migración del 10-08 la dejó vacía y anotada, con esto escrito: «queda
-- reservada para la senal positiva (`connect`), que todavia no existe».
-- Michael la pidió el 29-10, así que existe. Y de paso entra la otra señal
-- por mesa que hacía falta, `ausente`.
--
-- Su forma —señal por (mesa, quién opina, sobre quién)— es la correcta para
-- las dos, y por eso no se crean dos tablas nuevas:
--
--   connect  Quiero seguir en contacto con esta persona. Solo se le dice a
--            la otra si ella marcó lo mismo. Sin coincidencia NO PASA NADA y
--            nadie se entera jamás de que alguien la marcó.
--   ausente  Esta persona no vino. La marca quien se sentó, no operación.
--
-- LAS DOS CRUZAN UNA REGLA ESCRITA, Y MICHAEL LAS CRUZA A PROPÓSITO.
--
-- `connect` cruza «la encuesta de después no clasifica persona por persona».
-- El motivo de esa regla era que un «sí repetiría con X» no sirve para
-- repartir, porque no volvemos a juntar a la misma gente. Esto no reparte:
-- pasa un contacto. El veto de tres meses NO SE TOCA.
--
-- `ausente` cruza «quién vino lo marca operación, no el usuario». El motivo
-- era no cobrarle a quien acaba de cenar un trabajo nuestro. Michael, 29-10:
-- «son ellos los que saben quién fue». Es un toque, no una tarea, y operación
-- sigue decidiendo: solo se da por ausente a quien marcan DOS, y cuando no
-- coinciden lo revisa una persona.

-- Una señal por mesa, por quien opina y sobre quién. Pulsar dos veces no
-- crea dos filas: es la misma opinión dicha otra vez.
create unique index if not exists peer_feedback_una_por_pareja
  on peer_feedback (table_id, rater_id, rated_id, signal);

-- Y para cruzar las coincidencias y contar ausencias sin recorrer la tabla.
create index if not exists peer_feedback_por_mesa_y_senal
  on peer_feedback (table_id, signal);

comment on table peer_feedback is
  'Señales de una persona sobre otra DENTRO de una mesa. `connect`: quiere '
  'seguir en contacto, y solo se le dice a la otra si es mutuo. `ausente`: '
  'no vino, y hacen falta dos para darlo por bueno. Los bloqueos NO viven '
  'aquí: viven en `exclusions`.';

comment on column peer_feedback.signal is
  'connect | ausente. `avoid` y `neutral` están muertos: un bloqueo es de '
  'una pareja y es permanente, así que vive en `exclusions`.';
