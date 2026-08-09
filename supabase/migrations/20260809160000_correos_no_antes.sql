-- =====================================================================
-- Un correo de mesa no puede salir antes de la revelacion.
--
-- Hoy no hay remitente montado, asi que la regla vive solo en el codigo
-- que encola. El dia que exista, va a ser codigo nuevo escrito con prisa
-- —los correos siempre se montan con prisa— y esta es la unica regla del
-- producto que no admite un fallo: un correo adelantado convierte a Aro en
-- una agenda de reservas mas.
--
-- Asi que se pone en la base, donde el remitente no la puede saltar.
-- =====================================================================

alter table scheduled_emails
  add constraint correos_no_antes_de_hora
  check (sent_at is null or sent_at >= send_at);

comment on constraint correos_no_antes_de_hora on scheduled_emails is
  'Marcar un correo como enviado antes de su hora falla. La revelacion simultanea es el producto.';
