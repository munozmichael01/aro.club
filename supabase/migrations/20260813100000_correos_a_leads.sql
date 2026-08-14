-- La cola de correos puede escribirle a alguien que todavía no tiene cuenta.
--
-- `scheduled_emails.profile_id` era NOT NULL, así que solo se podía encolar
-- para miembros. Pero el primer correo del recorrido —«Guardamos tu puesto,
-- te escribimos en cuanto abramos mesa en tu zona»— va justo cuando alguien
-- deja su correo y todavía es un lead. Con la tabla como estaba, ese correo
-- no se podía ni anotar: por eso lleva desde el primer día sin dispararse.
--
-- Ahora la fila apunta a un perfil o a un correo suelto, y exige uno de los
-- dos. Un correo en cola sin destinatario no es una cola, es basura.

alter table scheduled_emails
  alter column profile_id drop not null;

alter table scheduled_emails
  add column if not exists email text;

alter table scheduled_emails
  add constraint scheduled_emails_con_destinatario
  check (profile_id is not null or email is not null);

comment on column scheduled_emails.email is
  'Destinatario cuando todavia no hay cuenta (un lead). Si hay profile_id, '
  'manda ese: la direccion de la cuenta puede cambiar y la del lead no se '
  'actualiza sola.';

-- Que no se encole dos veces la bienvenida al mismo correo. Sin esto, quien
-- vuelve a dejar su correo recibe otra, y el primer contacto del club seria
-- un duplicado.
create unique index if not exists scheduled_emails_bienvenida_unica
  on scheduled_emails (email)
  where kind = 'bienvenida' and email is not null;
