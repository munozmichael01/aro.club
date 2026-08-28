-- =====================================================================
-- `sent_at` no distingue enviado de tirado a la basura.
--
-- En `despacharPendientes` habia tres finales que escriben la misma marca:
--
--   1. se envio de verdad
--   2. no se pudo armar —un `console.error` y la fila se cierra—
--   3. la persona se dio de baja
--
-- Los tres quedan igual en la base. Preguntar «cuantos correos han salido»
-- devuelve la suma de los tres, y saber cual fue cada uno exigia buscar el
-- `console.error` en los registros de Vercel, que caducan.
--
-- Y hay un cuarto que no escribe nada y tampoco se ve: si el `kind` no tiene
-- plantilla, `componer` devuelve null y la fila se queda pendiente para
-- siempre, reintentandose cada cuarto de hora en silencio. Es lo que le
-- habria pasado a `empujon` entre aplicar su migracion y desplegar su codigo.
--
-- Dos columnas:
--
--   `estado`  que paso la ultima vez que se intento
--   `motivo`  el detalle, cuando lo hay (el error de armado, el de la API)
--
-- `estado` NO sustituye a `sent_at`. `sent_at` sigue siendo «esta fila esta
-- cerrada, no la mires mas»; `estado` es «esto fue lo que paso». Por eso los
-- dos finales que dejan la fila viva —sin plantilla, error de envio— tambien
-- escriben `estado`: asi una fila atascada dice por que lo esta en vez de
-- reintentarse callada.
--
-- Las filas de antes se quedan con `estado` nulo a proposito. Rellenarlas de
-- 'enviado' seria inventarse que las tres ramas fueron envios, que es
-- exactamente la mentira que esta migracion viene a quitar. Nulo significa
-- «esto es anterior a que lo supieramos».
-- =====================================================================

alter table scheduled_emails
  add column if not exists estado text,
  add column if not exists motivo text;

alter table scheduled_emails
  drop constraint if exists scheduled_emails_estado_valido;

alter table scheduled_emails
  add constraint scheduled_emails_estado_valido check (
    estado is null or estado in (
      'enviado',           -- salio de verdad, Resend lo acepto
      'no_se_pudo_armar',  -- cerrada: le faltan datos y manana le faltaran igual
      'dado_de_baja',      -- cerrada: la persona no quiere este correo
      'sin_plantilla',     -- viva: el `kind` no tiene fichero. Falta desplegar
      'error_de_envio'     -- viva: fallo la red o la API. Se reintenta solo
    )
  );

comment on column scheduled_emails.estado is
  'Que paso la ultima vez que se intento. Con `sent_at` no basta: cerraba '
  'igual un envio, un correo imposible de armar y una baja.';

comment on column scheduled_emails.motivo is
  'El detalle de `estado` cuando lo hay. Nunca contenido del correo.';

create index if not exists scheduled_emails_estado_idx
  on scheduled_emails (estado);
