-- Cuántas veces se apuntó alguien sin llegar a sentarse.
--
-- Es la pregunta 3 de la pestaña Gente, y hasta ahora no se podía responder.
-- Sin ella, «se apunta y no entra» devuelve exactamente la misma gente que
-- «tiene créditos y no ha reservado», y son dos preguntas distintas: la
-- segunda es dinero nuestro parado, la primera es una señal mala NUESTRA
-- —o no abrimos su zona, o no cuadra con nadie—.
--
-- Va como vista y no como columna, que es lo único donde me aparto de lo
-- pedido. La razón: un contador guardado hay que acordarse de subirlo en
-- cada reparto, en cada cancelación y en cada fecha que se cae, y el día que
-- se olvide una de esas tres el número miente sin avisar. Aquí el dato ya
-- existe entero —quién reservó y quién acabó sentado— así que contarlo es
-- exacto siempre y no hay nada que mantener. Con 500 perfiles el coste es
-- ninguno; si algún día pesa, esto se materializa sin tocar quien lo usa.
create or replace view v_espera_por_perfil as
select
  b.profile_id,
  count(*)::int as veces
from bookings b
join events e on e.id = b.event_id
where
  -- Se apuntó de verdad: un hold que caducó no es haberse apuntado.
  b.status in ('confirmed', 'attended')
  -- Y la fecha ya pasó. Estar sin mesa el martes para una cena del jueves es
  -- lo normal —todavía no se ha repartido—, no una señal de nada.
  and e.starts_at < now()
  -- Sin asiento en ninguna mesa de esa fecha.
  and not exists (
    select 1
    from table_members tm
    join dinner_tables dt on dt.id = tm.table_id
    where tm.profile_id = b.profile_id
      and dt.event_id = b.event_id
  )
group by b.profile_id;

comment on view v_espera_por_perfil is
  'Cuántas veces alguien se apuntó a una fecha que ya pasó y no llegó a '
  'sentarse en ninguna mesa. Es una señal sobre NOSOTROS —su zona no se '
  'abrió, o no cuadró con nadie—, no sobre esa persona. Se deriva en vez de '
  'guardarse para que no pueda desincronizarse.';

-- Cerrada como todo: solo la lee el servidor con la llave de servicio.
revoke all on v_espera_por_perfil from anon, authenticated;
