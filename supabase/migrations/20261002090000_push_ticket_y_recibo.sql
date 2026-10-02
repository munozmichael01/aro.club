-- El `provider_id` de las push.
--
-- `push_at` decía que salió y nada más, que es exactamente lo que pasaba con
-- el correo antes de guardar el id de Resend: cuando alguien dice «no me
-- llegó», no hay con qué preguntar. Expo da dos cosas y las dos hacen falta:
--
--  · el TICKET, en la respuesta inmediata — dice que Expo la aceptó;
--  · el RECIBO, minutos después — dice si el teléfono la recibió de verdad, y
--    es donde aparece el `DeviceNotRegistered` de quien desinstaló la app.
--
-- El ticket es jsonb y no texto porque una persona puede tener dos teléfonos:
-- se guarda `[{ "t": "<ticket>", "k": "<id del token>" }]`, y así el recibo
-- sabe DE QUÉ token hablar cuando hay que darlo de baja. Con un solo texto
-- habría que adivinarlo, y adivinar a cuál de los dos teléfonos de alguien se
-- le quitan las notificaciones no es algo que se deba adivinar.

alter table scheduled_emails
  add column if not exists push_ticket jsonb,
  add column if not exists push_recibo text;

comment on column scheduled_emails.push_ticket is
  'Tickets de Expo de esta fila: [{t: ticket, k: id del push_token}]. Es el provider_id de las push.';
comment on column scheduled_emails.push_recibo is
  'Lo que dijo el recibo de Expo: ok, o el error. Se lee en una pasada posterior del cron, no al mandar: Expo tarda minutos en tenerlo.';

-- Para que la pasada que lee recibos encuentre las suyas sin recorrer la
-- tabla entera: las que tienen ticket y todavía no tienen recibo.
create index if not exists scheduled_emails_recibo_pendiente
  on scheduled_emails (push_at)
  where push_ticket is not null and push_recibo is null;
