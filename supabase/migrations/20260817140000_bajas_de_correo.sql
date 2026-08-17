-- Quién no quiere que le escribamos.
--
-- Va por CORREO y no por perfil, y eso es lo importante: quien recibe la
-- bienvenida no tiene cuenta —solo dejó su dirección— así que no hay perfil
-- donde apuntar nada. Con una tabla por correo, la misma baja vale para un
-- lead y para un miembro, y sigue valiendo si ese lead se convierte en cuenta
-- más tarde. Al revés —guardarlo en `profiles.notificaciones`— la baja de un
-- lead no se podría ni registrar.
--
-- `profiles.notificaciones` sigue existiendo para los interruptores por tipo
-- de aviso dentro de Mi cuenta. Esto es la baja general, la del pie del
-- correo, que es la que tiene que funcionar sin sesión.
create table if not exists bajas_correo (
  correo      text primary key,

  -- Cuándo se dio de baja. Nulo = se deshizo, y se guarda la fila igualmente:
  -- saber que alguien se dio de baja y volvió es información, y borrar la fila
  -- la perdería.
  baja_at     timestamptz not null default now(),
  deshecha_at timestamptz,

  -- De dónde salió: del pie de un correo, de sus ajustes, o de operación.
  origen      text not null default 'pie-de-correo',

  created_at  timestamptz not null default now()
);

comment on table bajas_correo is
  'Bajas generales de correo, por dirección y no por perfil: quien recibe la '
  'bienvenida no tiene cuenta donde apuntarlo. `deshecha_at` no nulo = volvió '
  'a activarlos.';

comment on column bajas_correo.deshecha_at is
  'Se deshace poniendo fecha aquí, no borrando la fila: que alguien se diera '
  'de baja y volviera es un dato que interesa.';

-- Cerrada: solo el servidor, y siempre con token firmado o sesión.
alter table bajas_correo enable row level security;
revoke all on bajas_correo from anon, authenticated;
