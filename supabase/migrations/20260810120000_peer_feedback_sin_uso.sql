-- `peer_feedback` guardaba lo mismo que `exclusions`: cada bloqueo se
-- escribia en las dos, y el reparto solo leia una. Dos registros de la misma
-- verdad que nadie mantenia a la vez —quitar un bloqueo tenia que acordarse
-- de borrar los dos sitios— con el agravante de que la que decide quien se
-- sienta con quien era la que se podia quedar atras.
--
-- Un bloqueo no es de una mesa: es de una pareja y es permanente. Su sitio es
-- `exclusions`, con `created_by` para saber quien lo puso y `reason` para
-- distinguir el bloqueo del reporte.
--
-- La tabla NO se borra. Su forma —senal por (mesa, quien opina, sobre quien)—
-- es la correcta para lo que iba a ser: `connect` y `neutral`, la senal
-- positiva de con quien SI querria repetir. Eso no esta implementado y no
-- se escribe nunca, asi que se deja vacia y anotada, no a medias.

comment on table peer_feedback is
  'SIN USO. Los bloqueos viven en `exclusions`. Esta tabla queda reservada '
  'para la senal positiva (`connect`), que todavia no existe. Nada la '
  'escribe ni la lee: si aparece una fila, es codigo viejo.';

-- Las que quedaron de cuando se escribian las dos. Son duplicados exactos de
-- filas que siguen vivas en `exclusions`, asi que no se pierde nada.
delete from peer_feedback where signal = 'avoid';
