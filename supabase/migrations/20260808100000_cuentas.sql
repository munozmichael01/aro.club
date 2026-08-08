-- =====================================================================
-- Cuentas: el lead se convierte en perfil al cerrar el cuestionario.
--
-- Hasta aqui todo vivia en `waitlist`, sin identidad. La cuenta se crea
-- cuando se eligen las credenciales, que es cuando ya hay algo que
-- guardar (HANDOFF-3 §5).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Identidades de Apple y Google
--
-- Apple con «Ocultar mi correo» devuelve un relay que muere si el usuario
-- desvincula la app desde sus ajustes. Por eso se guardan DOS cosas: el
-- `sub` del proveedor como identidad estable, y el correo de contacto
-- como canal. Nunca una sola.
-- ---------------------------------------------------------------------

create type auth_provider_t as enum ('password', 'apple', 'google');

create table profile_identities (
  profile_id   uuid not null references profiles(id) on delete cascade,
  provider     auth_provider_t not null,
  -- El `sub` del proveedor. Nulo para 'password', que se identifica por correo.
  subject      text,
  -- El correo tal y como lo devolvio el proveedor, que puede no ser el de
  -- contacto: un relay de Apple, o un Gmail distinto al del registro.
  provider_email text,
  created_at   timestamptz not null default now(),
  primary key (profile_id, provider)
);

create unique index profile_identities_subject_uq
  on profile_identities (provider, subject) where subject is not null;

comment on table profile_identities is
  'Como entra cada persona. El subject es lo unico estable de Apple y Google: '
  'el correo puede cambiar o morir, el subject no.';


-- ---------------------------------------------------------------------
-- 2. El perfil gana el canal de contacto y de donde vino
-- ---------------------------------------------------------------------

alter table profiles
  -- El correo al que se escribe. Puede diferir del de la cuenta cuando
  -- Google devuelve otra direccion o Apple devuelve un relay.
  add column contact_email text,
  add column waitlist_id uuid references waitlist(id) on delete set null;

create index on profiles (contact_email);
create unique index profiles_waitlist_uq on profiles (waitlist_id)
  where waitlist_id is not null;

comment on column profiles.contact_email is
  'Canal real. Ahi llega el correo del jueves con la mesa, que es el producto. '
  'Si es null se usa email.';

-- `full_name` era obligatorio y no hay nombre hasta F3 · Datos base, que va
-- despues de crear la cuenta.
alter table profiles alter column full_name drop not null;


-- ---------------------------------------------------------------------
-- 3. Conversion de lead a perfil, en una sola sentencia
--
-- Se ata por el id del lead y NO por el correo: si alguien se registro con
-- juan@trabajo.com y entra con Google como juan@gmail.com, casar por correo
-- dejaria el lead huerfano y la cuenta vacia.
-- ---------------------------------------------------------------------

create or replace function convertir_lead(
  p_profile_id uuid,
  p_lead_email text,
  p_auth_email text
) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_lead waitlist%rowtype;
begin
  select * into v_lead from waitlist where email = p_lead_email;
  if not found then
    raise exception 'lead no encontrado: %', p_lead_email;
  end if;

  insert into profiles (
    id, email, contact_email, waitlist_id, full_name, display_name,
    birthdate, gender, phone_e164, rootedness, status
  ) values (
    p_profile_id, p_auth_email, v_lead.email, v_lead.id,
    v_lead.full_name, v_lead.display_name, v_lead.birthdate,
    coalesce(v_lead.gender, 'sin-decir'), v_lead.phone_e164, v_lead.rootedness,
    -- Con el cuestionario cerrado ya solo falta verificar identidad.
    case when v_lead.profile_completed_at is not null
         then 'pending_verification' else 'pending_questionnaire' end
  )
  on conflict (id) do nothing;

  -- Las respuestas viajan al almacen definitivo, clave por clave.
  insert into answers (profile_id, version_id, question_key, value)
  select p_profile_id, qv.id, clave, valor
  from questionnaire_versions qv,
       jsonb_each(coalesce(v_lead.profile_answers, '{}'::jsonb)) as x(clave, valor)
  where qv.is_active
  on conflict (profile_id, version_id, question_key) do update
    set value = excluded.value;

  -- Y las cuatro de la landing, que viven en columnas propias.
  insert into answers (profile_id, version_id, question_key, value)
  select p_profile_id, qv.id, t.clave, t.valor
  from questionnaire_versions qv,
       (values
         ('arraigo', to_jsonb(v_lead.rootedness)),
         ('zonas',   to_jsonb(v_lead.zones)),
         ('dias',    to_jsonb(v_lead.days)),
         ('temas',   to_jsonb(v_lead.conversation_topics))
       ) as t(clave, valor)
  where qv.is_active and t.valor is not null and t.valor <> 'null'::jsonb
  on conflict (profile_id, version_id, question_key) do update
    set value = excluded.value;

  update waitlist set converted_profile_id = p_profile_id where id = v_lead.id;
end $$;

comment on function convertir_lead is
  'Crea el perfil desde el lead y le pasa sus respuestas. Se ata por el id del '
  'lead, no por el correo: con Apple o Google el correo puede ser otro.';
