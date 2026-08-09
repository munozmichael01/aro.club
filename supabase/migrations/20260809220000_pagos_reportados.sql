-- =====================================================================
-- Entrega 9 · Un pago reportado no es un pago confirmado.
--
-- El cobro estaba modelado como instantaneo: pulsar y listo. En Venezuela
-- no lo es. Pago Movil, Zelle y Bizum son transferencias: la persona sale
-- al banco, paga, vuelve y REPORTA. Alguien cuadra ese reporte con el
-- movimiento real.
--
-- De ahi tres cosas que van en el esquema y no en el codigo:
--
--   1. El puesto se aparta AL REPORTAR. Esperar a la conciliacion
--      significaria que alguien paga y se queda sin sitio.
--   2. La tasa se congela al reportar. Entre reportar y confirmar pasan
--      horas y la tasa se mueve: vale el monto que reporto.
--   3. Los metodos se encienden desde una TABLA. En una constante del
--      codigo, encender Zelle un sabado exige un despliegue.
-- =====================================================================

create table if not exists payment_methods (
  id           text primary key,           -- 'pm', 'zelle', 'bizum', ...
  nombre       text not null,
  moneda       text not null,              -- VES, USD, EUR
  -- Manual = lo cuadra una persona. El debito inmediato lo confirma el
  -- banco, asi que se salta el estado pendiente.
  manual       boolean not null default true,
  activo       boolean not null default false,
  orden        int not null default 0,
  -- Nuestros datos para ese metodo: telefono y cedula del Pago Movil, el
  -- correo de Zelle, el numero de Bizum. Cambian sin tocar codigo.
  datos_cuenta jsonb not null default '{}'::jsonb,
  -- Lo que la persona tiene que rellenar al reportar. Cada metodo pide lo
  -- que de verdad genera: Zelle da un codigo alfanumerico, no una
  -- referencia numerica, y Bizum no da ninguna en el momento.
  campos       jsonb not null default '[]'::jsonb,
  -- Bizum no entrega referencia, asi que ahi la captura es obligatoria.
  captura_obligatoria boolean not null default false,
  actualizado_en timestamptz not null default now()
);

insert into payment_methods (id, nombre, moneda, manual, activo, orden, captura_obligatoria, campos) values
  ('pm', 'Pago Móvil', 'VES', true, true, 10, false,
   '[{"campo":"tel","etiqueta":"Teléfono emisor","tipo":"tel","prefijo":"+58","requerido":true},
     {"campo":"doc","etiqueta":"Cédula del titular","tipo":"documento","requerido":true},
     {"campo":"banco","etiqueta":"Banco emisor","tipo":"banco","requerido":true},
     {"campo":"ref","etiqueta":"Referencia","tipo":"numero","largo":6,"requerido":true},
     {"campo":"fecha","etiqueta":"Fecha del pago","tipo":"fecha","requerido":true}]'::jsonb),
  ('zelle', 'Zelle', 'USD', true, true, 20, false,
   '[{"campo":"titular","etiqueta":"Nombre del titular que envió","tipo":"texto","requerido":true},
     {"campo":"origen","etiqueta":"Correo o teléfono desde el que enviaste","tipo":"texto","requerido":true},
     {"campo":"codigo","etiqueta":"Código de confirmación","tipo":"alfanumerico","largo":14,"requerido":true},
     {"campo":"fecha","etiqueta":"Fecha del pago","tipo":"fecha","requerido":true}]'::jsonb),
  ('bizum', 'Bizum', 'EUR', true, true, 30, true,
   '[{"campo":"titular","etiqueta":"Nombre del titular","tipo":"texto","requerido":true},
     {"campo":"tel","etiqueta":"Teléfono","tipo":"tel","prefijo":"+34","requerido":true},
     {"campo":"fecha","etiqueta":"Fecha del pago","tipo":"fecha","requerido":true}]'::jsonb),
  ('debito', 'Débito inmediato', 'VES', false, false, 40, false,
   '[{"campo":"tel","etiqueta":"Teléfono","tipo":"tel","prefijo":"+58","requerido":true},
     {"campo":"doc","etiqueta":"Cédula","tipo":"documento","requerido":true},
     {"campo":"banco","etiqueta":"Banco","tipo":"banco","requerido":true},
     {"campo":"otp","etiqueta":"Código que te mandó el banco","tipo":"numero","largo":8,"requerido":true}]'::jsonb),
  ('tarjeta', 'Tarjeta', 'VES', false, false, 50, false, '[]'::jsonb)
on conflict (id) do update set
  nombre = excluded.nombre, moneda = excluded.moneda, manual = excluded.manual,
  orden = excluded.orden, campos = excluded.campos,
  captura_obligatoria = excluded.captura_obligatoria;

-- --- el reporte ------------------------------------------------------
alter table payments
  add column if not exists metodo text references payment_methods(id),
  -- Libre a proposito: cada metodo pide cosas distintas y una columna por
  -- campo obligaria a migrar el dia que entre uno nuevo.
  add column if not exists datos jsonb not null default '{}'::jsonb,
  add column if not exists fx_congelado_en timestamptz,
  add column if not exists reportado_en timestamptz,
  add column if not exists captura_path text,
  add column if not exists moneda text;

-- --- la tasa ---------------------------------------------------------
-- NO se siembra ninguna. La trae el cron del BCV a medianoche de Caracas.
--
-- Sembre una a 62,40 —el numero de la maqueta de Design— y fue peor que no
-- tener ninguna: la real son 756, asi que la pantalla enseñaba 499 Bs
-- cuando ocho dolares son seis mil. Una tasa inventada no es un valor por
-- defecto, es un precio equivocado.

alter table payment_methods enable row level security;
create policy metodos_lectura on payment_methods
  for select using (activo = true or is_ops());

-- --- el hueco de 24 horas de `no_cuadra` -----------------------------
-- Un reporte que no cuadra NO libera el puesto: lo mantiene 24 h para que
-- corrija. Es un error nuestro tanto como suyo.
alter table bookings
  add column if not exists hold_until timestamptz;

comment on column bookings.hold_until is
  'Hasta cuando se le guarda el puesto con el pago sin cuadrar. Vencido, se libera.';
