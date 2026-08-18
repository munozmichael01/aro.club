-- =====================================================================
-- Darse de baja deja de cerrar la puerta para siempre.
--
-- `/api/baja` lo promete por escrito: «el correo se libera: se cambia por
-- uno de lápida para que pueda volver a registrarse algún día con el suyo».
-- Y lo hacía a medias: cambiaba el correo en `auth.users` y dejaba
-- `profiles.email` con la dirección original. Esa columna es única, así que
-- quien se daba de baja no podía volver a registrarse NUNCA con su correo:
-- el alta reventaba contra `profiles_email_key`.
--
-- No se ve al darse de baja —eso funciona— sino meses después, el día que
-- alguien quiere volver. Y quien vuelve no escribe para contarlo: se va.
--
-- La lápida usa el mismo formato que ya escribe la ruta en auth, para que
-- las dos filas se puedan cruzar mirándolas.
-- =====================================================================

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
    -- Lo que faltaba. `contact_email` también: era el correo del lead, y
    -- guardarlo después de una baja es guardar justo lo que pidió borrar.
    email         = 'baja+' || p_profile_id || '@aro.club',
    contact_email = null,
    deleted_at   = now(),
    status       = 'paused'
  where id = p_profile_id;
end;
$$;

revoke all on function dar_de_baja(uuid) from public, anon, authenticated;
