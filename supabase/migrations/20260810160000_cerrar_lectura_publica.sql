-- Con la clave publica —la que va dentro del navegador por definicion— se
-- podian leer `restaurants` y `events` enteras. Dos consecuencias, y la
-- segunda es peor que la primera.
--
-- 1 · Se filtraban nuestras condiciones comerciales y datos de terceros:
--     comision, menu cerrado, notas de seguridad, y el nombre y telefono de
--     la persona de contacto de cada local. Ese telefono es de alguien que
--     no es cliente nuestro y nunca acepto que lo publicaramos.
--
-- 2 · `events` expone `restaurant_id`. Cruzandolo con `restaurants`,
--     cualquiera sabia EN QUE RESTAURANTE es una fecha antes de la
--     revelacion. Es exactamente el mecanismo que el producto protege: la
--     API se niega a devolver el sitio antes de `reveal_at`, y la tabla
--     cruda lo daba igual. Proteger la dosificacion solo en la capa de
--     aplicacion no sirve de nada si la fila esta abierta debajo.
--
-- Nadie lee estas tablas desde el navegador: las pantallas llaman a /api/*
-- y las rutas usan la clave de servicio. Cerrarlas no rompe nada.

-- --- restaurants: solo operacion -------------------------------------
drop policy if exists restaurants_read on restaurants;

create policy restaurants_solo_ops on restaurants
  for select using (is_ops());

comment on table restaurants is
  'Lectura directa SOLO para operacion. Lo que ve un miembro de su sitio '
  '—nombre, direccion, mapa, foto— sale por /api/mi-mesa despues de la '
  'revelacion, nunca de una lectura directa.';

-- --- events: lo publico es la fecha, no donde ------------------------
--
-- La fecha SI es publica: la landing anuncia que hay cena el jueves y eso
-- es captacion. Lo que no puede salir es el sitio. Como PostgREST no filtra
-- por columna, la fila entera pasa a ser de operacion y lo publico se
-- sirve por una vista con solo lo que se puede contar.
drop policy if exists events_read on events;

create policy events_solo_ops on events
  for select using (is_ops());

create or replace view v_fechas_publicas
with (security_invoker = false) as
select
  e.id,
  e.format,
  e.starts_at,
  e.booking_closes_at,
  e.reveal_at,
  e.status,
  e.price_usd,
  e.credit_cost,
  e.seats_per_table,
  e.city_slug,
  -- La zona SI: quien se apunta elige zona, asi que saber que zonas se
  -- abren es parte de decidir. El restaurante concreto, no.
  e.zone_slug
from events e
where e.status <> 'draft';

comment on view v_fechas_publicas is
  'Lo que se puede contar de una fecha antes de la revelacion: cuando, '
  'cuanto, en que zonas. NUNCA `restaurant_id`: el sitio es la sorpresa.';

grant select on v_fechas_publicas to anon, authenticated;
