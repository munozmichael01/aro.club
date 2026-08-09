-- =====================================================================
-- El trigger contaba cada pareja DOS veces.
--
-- record_pair_encounters es AFTER INSERT FOR EACH ROW. En un insert de
-- seis filas, Postgres encola los triggers y los dispara al final de la
-- sentencia, cuando las seis ya son visibles. Asi que la fila de X ve a Y
-- y crea el par, y la fila de Y ve a X y lo vuelve a incrementar.
--
-- Resultado: una mesa de seis dejaba 15 parejas con times_met = 2 en vez
-- de 1. Y times_met es lo que sostiene la regla de no repetir en 6 meses.
--
-- Arreglo: cada pareja la registra solo una de las dos filas, la mayor.
-- Para el par (X, Y) con X < Y, la fila de Y ve a X y lo cuenta; la fila
-- de X ve a Y, no cumple la condicion, y no hace nada.
-- =====================================================================

create or replace function record_pair_encounters() returns trigger
language plpgsql as $$
declare
  t_event_at timestamptz;
begin
  select e.starts_at into t_event_at
  from dinner_tables dt join events e on e.id = dt.event_id
  where dt.id = new.table_id;

  insert into pair_encounters (profile_a, profile_b, times_met, last_met_at)
  select least(new.profile_id, tm.profile_id),
         greatest(new.profile_id, tm.profile_id),
         1,
         coalesce(t_event_at, now())
  from table_members tm
  where tm.table_id = new.table_id
    -- Solo hacia abajo: asi cada pareja la cuenta una sola de las dos filas.
    and tm.profile_id < new.profile_id
  on conflict (profile_a, profile_b) do update
    set times_met = pair_encounters.times_met + 1,
        last_met_at = greatest(pair_encounters.last_met_at, excluded.last_met_at);
  return new;
end $$;

-- Lo ya acumulado esta inflado al doble. Como todavia no hay cenas reales,
-- se deja a cero: es mas honesto que dividir entre dos y arrastrar la duda.
delete from pair_encounters where times_met >= 0;
