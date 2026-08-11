-- Entrega 10, §4.1 y §4.2.

-- ---------------------------------------------------------------------
-- 1 · El documento tiene tipo
-- ---------------------------------------------------------------------
-- El esquema de la 9 asumia V. Hay extranjeros residentes pagando con
-- cedula E, y sin ese campo operacion no puede cuadrar su pago movil: busca
-- un V-18442019 que no existe.
--
-- La letra va APARTE del numero. Si se teclea dentro, se descarta —es la
-- misma regla que evito el «+58 +58 4241234501»— y por eso el campo se
-- marca `conTipo` en vez de esperar que alguien escriba "V-18442019".
update payment_methods
set campos = (
  select jsonb_agg(
    case when c->>'tipo' = 'documento'
         then c || '{"conTipo": true}'::jsonb
         else c end
  )
  from jsonb_array_elements(campos) c
)
where campos @> '[{"tipo":"documento"}]';

-- ---------------------------------------------------------------------
-- 2 · Notificaciones: cinco claves, dos que no se apagan
-- ---------------------------------------------------------------------
-- Los cuatro primeros llegan encendidos: es lo que se acepta al crear la
-- cuenta y ya esta escrito en el legal. `mesa_jueves` y `dia_cena` no se
-- pueden apagar porque sin ellos no sabe donde es la cena, y eso no es una
-- preferencia: es la unica forma de que el producto funcione.
alter table profiles
  add column if not exists notificaciones jsonb not null default
    '{"mesa_jueves": true, "dia_cena": true, "pago_ok": true, "apertura_zona": true, "whatsapp": false}'::jsonb;

comment on column profiles.notificaciones is
  'Cinco claves. `mesa_jueves` y `dia_cena` son fijas: sin ellas no sabe '
  'donde es la cena. `whatsapp` NO es una preferencia, es un permiso, y su '
  'fecha esta en `whatsapp_opt_in_at`.';

-- WhatsApp es el unico dato de este bloque con implicacion legal, asi que
-- se guarda CUANDO lo dio. Un booleano sin fecha no defiende nada.
alter table profiles
  add column if not exists whatsapp_opt_in_at timestamptz;

comment on column profiles.whatsapp_opt_in_at is
  'Cuando dio el permiso de WhatsApp. Un consentimiento sin fecha no es '
  'defendible: es lo mismo que no tenerlo.';

-- Los perfiles que ya existen se quedan con el valor por defecto —los cuatro
-- encendidos, WhatsApp apagado— que es exactamente lo que aceptaron: nadie
-- ha dado permiso de WhatsApp todavia.
update profiles set whatsapp_opt_in = false where whatsapp_opt_in is null;
