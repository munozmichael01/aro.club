-- Una fila de la cola se manda UNA vez, aunque dos pasadas corran a la vez.
--
-- Esta noche, en el envío de «vamos a equilibrar las mesas», hubo gente que
-- recibió el mismo correo dos veces teniendo UNA SOLA fila en la cola. No se
-- escribió dos veces: se mandó dos veces.
--
-- `encolar` termina llamando a `despacharPendientes`, y esa función no coge
-- la fila que acaba de crearse: barre TODAS las que tengan `sent_at` nulo y
-- la hora vencida. `sent_at` se escribe DESPUÉS de que Resend acepte. Así
-- que dos barridos simultáneos leen la misma fila sin marca, y los dos la
-- mandan. Mientras los envíos van en serie no pasa nada; en cuanto la
-- plataforma reintenta una petición que sigue viva, sí.
--
-- La marca es esta columna: antes de componer nada, la pasada intenta
-- quedarse la fila con un update condicional. Postgres serializa los dos
-- updates sobre la misma fila, así que el segundo no encuentra nada que
-- actualizar y la salta.
--
-- Con caducidad a propósito: si una pasada se queda a medias —se acaba el
-- tiempo de la función, se cae la red— la fila volvería a estar tomada para
-- siempre y ese correo no saldría nunca. A los diez minutos se puede volver
-- a tomar, que es de sobra para un envío que tarda segundos.
alter table scheduled_emails
  add column if not exists tomada_at timestamptz;

comment on column scheduled_emails.tomada_at is
  'Cuándo una pasada se quedó esta fila para mandarla. Impide que dos '
  'barridos simultáneos manden el mismo correo dos veces. Se puede volver a '
  'tomar pasados 10 minutos, por si la pasada que la tomó murió a medias.';

create index if not exists scheduled_emails_tomada
  on scheduled_emails (tomada_at)
  where sent_at is null;
