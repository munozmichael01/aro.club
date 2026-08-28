-- =====================================================================
-- Un empujon por persona y por estado. Insistir es spam.
--
-- Dos indices porque el empujon se encola de dos formas: por correo
-- (quien dejo su direccion y no tiene perfil todavia) y por perfil (quien
-- termino el perfil y no se ha verificado). Un solo indice no cubre las
-- dos: en la primera `profile_id` es nulo, en la segunda lo es `email`.
--
-- Y con el estado dentro. No es lo mismo «te falta el perfil» que «te
-- falta verificarte»: son dos momentos distintos del embudo, y quien
-- recibio el primero, hizo caso y luego se atasco en el segundo no esta
-- recibiendo insistencia, esta recibiendo el aviso del sitio nuevo donde
-- se paro. Lo que no puede repetirse es el mismo empujon, y eso es lo que
-- estos dos indices cierran.
--
-- La rama de verificacion lo necesita de verdad. Encola con
-- `{ perfil: id }`, que deja `email` nulo y esquiva el indice parcial de
-- la bienvenida. Y el otro indice, `scheduled_emails_una_por_persona`,
-- es (profile_id, kind, event_id) sin parcial: con `event_id` nulo los
-- NULL son distintos entre si en Postgres y no agrupa nada —lo dice el
-- comentario de 20260808150000—. O sea que hasta hoy lo unico que impedia
-- repetir ese correo cada hora era un `Set` en memoria del propio cron,
-- construido leyendo la cola. Un `Set` que se queda vacio en cuanto algo
-- borra la fila: `scripts/cuenta-demo.mjs` borra por `profile_id`.
-- =====================================================================

create unique index if not exists scheduled_emails_empujon_correo
  on scheduled_emails (email, (payload ->> 'falta'))
  where kind = 'empujon' and email is not null;

create unique index if not exists scheduled_emails_empujon_perfil
  on scheduled_emails (profile_id, (payload ->> 'falta'))
  where kind = 'empujon' and profile_id is not null;
