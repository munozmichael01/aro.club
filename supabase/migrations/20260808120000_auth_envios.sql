-- =====================================================================
-- Tope de envios por correo y hora.
--
-- El contrato pide maximo 3 por correo y hora, y no mandar nada si la
-- cuenta no existe. Sin llevar la cuenta en algun sitio, cualquiera puede
-- usar la recuperacion para sondear quien esta registrado y de paso hacer
-- que paguemos por cada intento.
-- =====================================================================

create table auth_envios (
  id         bigserial primary key,
  email      text not null,
  kind       text not null,          -- 'recuperar', 'magico', ...
  created_at timestamptz not null default now()
);

-- El indice sirve al conteo de la ultima hora, que es la unica consulta.
create index auth_envios_email_fecha on auth_envios (email, created_at desc);

alter table auth_envios enable row level security;
-- Sin politicas: solo el servidor con service_role toca esta tabla.

comment on table auth_envios is
  'Un registro por envio realmente enviado. Solo se escribe cuando la cuenta '
  'existe: si se escribiera siempre, el propio conteo delataria quien esta '
  'registrado.';
