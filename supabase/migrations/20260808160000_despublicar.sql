-- =====================================================================
-- Republicar inflaba el historial de encuentros.
--
-- Borrar dinner_tables arrastra table_members, pero pair_encounters no:
-- es un acumulado que su trigger incrementa. Al republicar, los pares de
-- la version anterior se quedaban Y se sumaban los nuevos. Con 12
-- personas paso de 30 a 48.
--
-- Eso no es un numero feo: pair_encounters es lo que impide repetir mesa
-- en 6 meses, asi que cada par inflado veta a dos personas por una cena
-- que no ocurrio.
-- =====================================================================

create or replace function despublicar_evento(p_event_id uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  -- Se deshace lo que el trigger sumo: un paso atras por cada par que
  -- estas mesas habian registrado.
  with pares as (
    select least(a.profile_id, b.profile_id) as pa,
           greatest(a.profile_id, b.profile_id) as pb
    from table_members a
    join table_members b on b.table_id = a.table_id and a.profile_id < b.profile_id
    join dinner_tables dt on dt.id = a.table_id
    where dt.event_id = p_event_id
  )
  update pair_encounters pe
     set times_met = pe.times_met - 1
    from pares p
   where pe.profile_a = p.pa and pe.profile_b = p.pb;

  -- Los que se quedan a cero es que solo se vieron en esta mesa.
  delete from pair_encounters where times_met <= 0;

  delete from dinner_tables where event_id = p_event_id;
end $$;

comment on function despublicar_evento is
  'Deshace una publicacion: quita las mesas y descuenta los encuentros que '
  'habian registrado. Sin esto, republicar veta parejas por cenas que no '
  'llegaron a ocurrir.';
