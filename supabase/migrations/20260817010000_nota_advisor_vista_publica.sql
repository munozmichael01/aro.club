-- El Advisor de Supabase marca `v_fechas_publicas` como CRITICAL por estar
-- definida con SECURITY DEFINER. Es correcto de patrón y falso de fondo, y
-- queda escrito aquí para que nadie lo «arregle» y reabra media base.
--
-- La vista es EL MECANISMO, no un descuido:
--
--   `events` está cerrada a operación —política `events_solo_ops`— porque la
--   fila entera lleva el restaurante, y el restaurante es la sorpresa del
--   jueves. Postgres no da permisos por columna en una política de RLS, así
--   que lo público se sirve por una vista con las columnas contadas.
--
--   Si se pusiera `security_invoker = true`, la vista heredaría la RLS de
--   quien pregunta y no devolvería nada a un visitante — o habría que abrir
--   `events` a `anon`, que es exactamente lo que se cerró el 10 de agosto.
--
-- Comprobado con la llave anónima el 17 de agosto de 2026: la vista devuelve
-- once columnas y ninguna es `restaurant_id`; `events`, `profiles`,
-- `bookings`, `payments`, `verifications` y `scheduled_emails` responden 42501.
--
-- Si algún día se añade una columna a `events`, NO entra sola en la vista:
-- hay que añadirla a mano aquí, y ese es justo el control que se busca.
comment on view v_fechas_publicas is
  'Lo que se puede contar de una fecha antes de la revelacion: cuando, '
  'cuanto, en que zonas. NUNCA `restaurant_id`: el sitio es la sorpresa. '
  'SECURITY DEFINER a proposito: `events` esta cerrada a ops y esta vista es '
  'la unica puerta publica. El Advisor la marca como CRITICAL; es esperado.';
