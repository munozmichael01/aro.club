-- =====================================================================
-- El indice unico de la cola de correos no podia usarse para upsert.
--
-- Era parcial (`where event_id is not null`) y ON CONFLICT no puede
-- inferir un indice parcial desde una lista de columnas: fallaba con
-- 42P10 y la cola quedaba vacia.
--
-- Sin el parcial sigue haciendo su trabajo: en Postgres los NULL son
-- distintos entre si, asi que los correos sin fecha asociada (bienvenida)
-- pueden repetirse por persona sin chocar.
-- =====================================================================

drop index if exists scheduled_emails_una_por_persona;

create unique index scheduled_emails_una_por_persona
  on scheduled_emails (profile_id, kind, event_id);
