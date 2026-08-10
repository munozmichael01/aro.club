-- La baja tiene que ser todo o nada.
--
-- La primera version la hacia en seis pasos desde la ruta: borrar respuestas,
-- rasgos, verificaciones, miembros de mesa, cancelar reservas y por ultimo
-- anonimizar el perfil. El ultimo paso reventó —`gender` es NOT NULL y yo lo
-- ponia a null— y el resultado fue el peor estado posible: **los datos
-- borrados y la cuenta viva**. Alguien que pidio irse se queda dentro, sin
-- sus respuestas y sin poder entrar al reparto, sin que nadie se entere.
--
-- Una operacion destructiva de varios pasos no puede vivir en la aplicacion.
-- Aqui es una transaccion: o se hace entera o no se toca nada.

create or replace function dar_de_baja(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Lo que prometimos borrar.
  delete from answers        where profile_id = p_profile_id;
  delete from profile_traits where profile_id = p_profile_id;
  delete from verifications  where profile_id = p_profile_id;

  -- No puede quedar sentada en la mesa del jueves alguien que ya no esta.
  delete from table_members  where profile_id = p_profile_id;

  update bookings set status = 'cancelled_by_user'
  where profile_id = p_profile_id
    and status in ('held', 'pending_payment', 'confirmed', 'waitlisted');

  -- La lapida. `full_name` y `gender` son NOT NULL, asi que no se vacian:
  -- se sustituyen por lo que no dice nada de nadie.
  update profiles set
    full_name    = 'Cuenta dada de baja',
    display_name = null,
    birthdate    = null,
    gender       = 'undisclosed',
    phone_e164   = null,
    deleted_at   = now(),
    status       = 'paused'
  where id = p_profile_id;
end;
$$;

comment on function dar_de_baja is
  'Baja de cuenta, en una transaccion. Borra respuestas, rasgos y '
  'verificaciones; cancela reservas; anonimiza el perfil. NO borra la fila: '
  'de ella cuelgan pagos y creditos que el legal obliga a conservar.';

revoke all on function dar_de_baja(uuid) from public, anon, authenticated;
