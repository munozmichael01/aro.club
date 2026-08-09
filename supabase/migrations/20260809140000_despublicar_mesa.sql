-- =====================================================================
-- Despublicar UNA mesa.
--
-- despublicar_evento deshacia la fecha entera. Con publicacion por tandas
-- eso es justo lo que no se quiere: tirar las mesas ya cerradas para poder
-- corregir una.
--
-- Deshacer una mesa es tres cosas, y las tres tienen que ir juntas:
--   1. Descontar los encuentros que su publicacion sumo. Si no, esos seis
--      quedan vetados seis meses por una cena que se cancelo.
--   2. Quitar los correos que quedaron en cola, si todavia no salieron.
--      Los que ya salieron NO se tocan: la gente ya lo leyo, y borrar el
--      registro no deshace el correo, solo nos deja sin saber que se mando.
--   3. Borrar la mesa, que arrastra a sus miembros.
-- =====================================================================

create or replace function despublicar_mesa(p_table_id uuid)
returns table (correos_retirados int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event uuid;
  v_perfiles uuid[];
  v_n int;
begin
  select event_id into v_event from dinner_tables where id = p_table_id;
  if v_event is null then
    raise exception 'esa mesa no existe';
  end if;

  select array_agg(profile_id) into v_perfiles
  from table_members where table_id = p_table_id;

  if v_perfiles is null then
    delete from dinner_tables where id = p_table_id;
    return query select 0;
    return;
  end if;

  -- 1. Los encuentros de esta mesa, uno menos.
  update pair_encounters pe
     set times_met = pe.times_met - 1
   where exists (
     select 1
     from unnest(v_perfiles) a(pa), unnest(v_perfiles) b(pb)
     where pa < pb
       and pe.profile_a = least(pa, pb)
       and pe.profile_b = greatest(pa, pb)
   );

  delete from pair_encounters where times_met <= 0;

  -- 2. Los correos que aun no han salido.
  delete from scheduled_emails
   where event_id = v_event
     and kind = 'mesa_asignada'
     and sent_at is null
     and profile_id = any(v_perfiles);
  get diagnostics v_n = row_count;

  -- 3. La mesa. table_members cae con ella.
  delete from dinner_tables where id = p_table_id;

  return query select v_n;
end $$;
