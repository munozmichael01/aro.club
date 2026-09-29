-- Guardar con qué buscar un correo cuando alguien dice que no le llegó.
--
-- Resend devuelve un id en cada envío y lo estábamos tirando: `enviar()` lo
-- recibe, lo devuelve, y quien lo recibe no lo escribe en ningún sitio.
--
-- La consecuencia se vio hoy. Michael canceló, la fila quedó con `sent_at`
-- puesto —o sea: Resend lo aceptó— y el correo no apareció en su buzón. La
-- pregunta obvia es qué dice Resend de ese envío: si rebotó, si lo marcaron
-- como spam, si sigue en cola. Y no se puede preguntar, porque no sabemos
-- cuál de sus envíos era.
--
-- `sent_at` NO significa entregado. Significa que Resend lo aceptó. Con el id
-- guardado, la diferencia entre las dos cosas se puede mirar.

alter table scheduled_emails
  add column if not exists provider_id text;

comment on column scheduled_emails.provider_id is
  'El id que devuelve Resend al aceptar el envio. Es con lo que se consulta '
  'su last_event cuando alguien dice que no le llego. `sent_at` solo dice que '
  'Resend lo acepto, no que se entregara.';
