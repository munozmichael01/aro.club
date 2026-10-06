-- La push del juego de la mesa.
--
-- Es el primer aviso que es **solo push**: no tiene correo ni plantilla. Un
-- correo diciendo «abran el juego» llegaría cuando ya estén cenando y nadie
-- mira el correo en la mesa; una push veinte minutos después de sentarse es
-- justo el momento en que ya pidieron y se hace el silencio.
--
-- Viaja igual que las demás, en una fila de `scheduled_emails` con su
-- `send_at`. Lo único distinto es que al despacharla no se compone correo.

alter type email_kind_t add value if not exists 'juego';

-- Un final propio para lo que es solo push.
--
-- Sin esto, una fila sin plantilla se cierra como `sin_plantilla`, que es un
-- ESTADO DE ERROR: dice «falta desplegar el fichero» y deja la fila viva para
-- reintentarla. Aquí no falta nada, y la fila ya terminó su trabajo.
alter table scheduled_emails
  drop constraint if exists scheduled_emails_estado_valido;

alter table scheduled_emails
  add constraint scheduled_emails_estado_valido check (
    estado is null or estado in (
      'enviado',
      'no_se_pudo_armar',
      'dado_de_baja',
      'sin_plantilla',
      'error_de_envio',
      'solo_push'
    )
  );
