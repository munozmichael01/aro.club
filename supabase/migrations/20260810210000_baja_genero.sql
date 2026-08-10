-- `gender_t` no tiene 'undisclosed': la entrega 7 renombró los cuatro
-- valores a los códigos del contrato, y 'undisclosed' pasó a 'sin-decir'.
-- Escribí el de la migración inicial sin mirar el renombrado.
--
-- La transacción hizo su trabajo: reventó entera y no toco ni una fila. Es
-- exactamente para esto.

create or replace function dar_de_baja(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from answers        where profile_id = p_profile_id;
  delete from profile_traits where profile_id = p_profile_id;
  delete from verifications  where profile_id = p_profile_id;
  delete from table_members  where profile_id = p_profile_id;

  update bookings set status = 'cancelled_by_user'
  where profile_id = p_profile_id
    and status in ('held', 'pending_payment', 'confirmed', 'waitlisted');

  update profiles set
    full_name    = 'Cuenta dada de baja',
    display_name = null,
    birthdate    = null,
    gender       = 'sin-decir',
    phone_e164   = null,
    deleted_at   = now(),
    status       = 'paused'
  where id = p_profile_id;
end;
$$;

revoke all on function dar_de_baja(uuid) from public, anon, authenticated;
