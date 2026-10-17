-- =====================================================================
-- Cuánto gastaste, y qué local no quieres repetir.
--
-- Michael, 17-10, dos peticiones del mismo sitio:
--
-- 1 · «la encuesta no pregunta cuánto gastaste, y sin eso el tramo de los
--     locales se queda en lo que escribimos a ojo». Cierto: `restaurants
--     .avg_check_usd` es lo DECLARADO al dar de alta el local, lo escribe
--     operación, y de once locales activos tres no lo tienen. Mestre está
--     en tramo 1 con la misma cuenta media que Masala, que está en 2.
--
-- 2 · Leonor, en el texto libre de anoche: «así como permite excluir
--     personas de próximas cenas, que también permita excluir
--     restaurantes». Y con eso llega su hermana: no repetir sitio a la
--     misma persona dos veces seguidas.
--
-- Las dos van en `table_feedback`, que es donde la encuesta ya escribe. NO
-- en `venue_feedback`, que se creó para esto, está vacía, no la lee ni la
-- escribe nadie en todo `src/` y pide un `rating` 1..5 que la encuesta de
-- la entrega 16 ya no usa. Dos sitios para el mismo dato es como este repo
-- ha divergido otras veces; se deja dicho aquí y se usa uno.
-- =====================================================================

alter table table_feedback
  add column if not exists gasto_usd numeric(8,2) check (gasto_usd >= 0),
  add column if not exists sitio_no_repetir boolean not null default false;

comment on column table_feedback.gasto_usd is
  'Lo que gasto esa persona esa noche, por persona y sin la plaza de Aro. '
  'OPCIONAL: es una pregunta sobre el dinero de alguien. De aqui sale el '
  'gasto REAL de un local, frente a restaurants.avg_check_usd, que es lo que '
  'declaramos al darlo de alta.';

comment on column table_feedback.sitio_no_repetir is
  'Esta persona no quiere que la volvamos a mandar a ese local. Lo pidio '
  'Leonor en la encuesta del 17-10. Es una preferencia suya y no una queja '
  'del sitio: no baja su nota ni se le dice al restaurante.';

comment on table venue_feedback is
  'MUERTA. Se creo para la nota y el gasto del local y nunca se escribio: '
  'la encuesta de la entrega 16 guarda las cuatro notas del sitio en '
  'table_feedback.sitio_* y, desde el 17-10, tambien el gasto. No usar.';

-- El gasto real de cada local, para poder comparar con lo declarado.
create or replace view v_gasto_de_local as
select
  dt.restaurant_id,
  count(tf.gasto_usd)                          as respuestas,
  round(avg(tf.gasto_usd)::numeric, 2)         as gasto_medio,
  min(tf.gasto_usd)                            as gasto_min,
  max(tf.gasto_usd)                            as gasto_max
from table_feedback tf
join dinner_tables dt on dt.id = tf.table_id
where tf.gasto_usd is not null
group by dt.restaurant_id;

comment on view v_gasto_de_local is
  'Lo que de verdad gasta la gente en cada local, de la encuesta del dia '
  'despues. Se compara con restaurants.avg_check_usd, que es lo declarado.';
