-- Deshacer el último reparto.
--
-- Michael, 17-10: «necesito un deshacer del volver a repartir». Repartir es
-- la acción más grande del panel —mueve a todo el mundo de sitio— y hasta
-- hoy no tenía vuelta atrás: cada corrida INSERTA una fila nueva en
-- `matching_runs` y el panel lee siempre la última por fecha, así que la
-- propuesta anterior seguía ahí, intacta, y era imposible volver a ella.
--
-- No se borra la corrida nueva: se marca descartada. Borrar sería perder lo
-- que el algoritmo propuso y con qué pesos, que es justo lo que hace falta
-- para entender por qué una mesa salió como salió. Y así deshacer dos veces
-- sigue el rastro hacia atrás en vez de abrir un agujero.
alter table matching_runs add column if not exists descartada_at timestamptz;

comment on column matching_runs.descartada_at is
  'Cuándo se deshizo este reparto. El panel lee la última corrida SIN descartar.';
