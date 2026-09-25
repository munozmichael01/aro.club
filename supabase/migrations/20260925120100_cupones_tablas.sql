-- Las tablas del cupón. Van aparte de la migración de los enums porque los
-- valores nuevos de un enum no se pueden usar en la misma transacción que los
-- declara, y el método de pago se inserta aquí.

-- El método que no cobra. INACTIVO a propósito: nunca es una opción que
-- alguien elija de la lista, pero existe para que `payments.metodo` —que es
-- una clave foránea contra esta tabla— tenga a dónde apuntar. Sin él, el pago
-- de un cupón sería una fila huérfana y el histórico de operación la vería
-- rara.
insert into payment_methods (id, nombre, moneda, manual, activo, campos, datos_cuenta, captura_obligatoria)
values ('cupon', 'Cupón', 'USD', false, false, '[]'::jsonb, '{}'::jsonb, false)
on conflict (id) do nothing;

-- --------------------------------------------------------------------
-- Los códigos.
-- --------------------------------------------------------------------
create table if not exists coupons (
  code           text primary key,
  -- Nace en 100 y admite parciales sin otra migración el día que hagan falta.
  descuento_pct  smallint not null default 100 check (descuento_pct between 1 and 100),
  -- null = sin tope. Se pone tope igualmente: un código compartido que no
  -- caduca ni se agota es un puesto gratis indefinido para quien lo reenvíe.
  max_usos       integer check (max_usos is null or max_usos > 0),
  usados         integer not null default 0 check (usados >= 0),
  caduca_at      timestamptz,
  -- null = vale para cualquier fecha. Es lo que pidió Michael.
  event_id       uuid references events(id) on delete cascade,
  activo         boolean not null default true,
  nota           text,
  created_at     timestamptz not null default now()
);

comment on table coupons is
  'Códigos que apartan el puesto sin cobrar. Se aplican en /pago y confirman '
  'la reserva en el acto, sin pasar por conciliación.';
comment on column coupons.event_id is
  'null = cualquier fecha. Atarlo a un evento limita el código a esa cena.';
comment on column coupons.usados is
  'Se sube al canjear. El tope de verdad es el índice único de '
  'coupon_redemptions: un uso por persona.';

-- --------------------------------------------------------------------
-- Quién lo usó. Es la tabla que hace que «compartido» no sea barra libre.
-- --------------------------------------------------------------------
create table if not exists coupon_redemptions (
  id          uuid primary key default gen_random_uuid(),
  code        text not null references coupons(code) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  booking_id  uuid references bookings(id) on delete set null,
  payment_id  uuid references payments(id) on delete set null,
  created_at  timestamptz not null default now(),
  -- UN USO POR PERSONA. Es la única cosa que contiene un código compartido,
  -- del 100% y sin fecha: sin esto, la misma persona lo canjea cada semana.
  constraint coupon_redemptions_uno_por_persona unique (code, profile_id)
);

create index if not exists coupon_redemptions_perfil on coupon_redemptions (profile_id);

comment on constraint coupon_redemptions_uno_por_persona on coupon_redemptions is
  'Un código por persona y ya. Es el tope real del cupón compartido.';

-- --------------------------------------------------------------------
-- Cerradas a cal y canto. Solo el servidor las toca.
-- --------------------------------------------------------------------
alter table coupons enable row level security;
alter table coupon_redemptions enable row level security;

-- --------------------------------------------------------------------
-- Y el primero, el de la cena de creadores.
--
-- Diez usos y hasta el 31 de octubre: Michael pidió compartido, del 100% y
-- para cualquier fecha, y no dijo nada de tope ni de caducidad. Se ponen
-- estos dos porque un código sin ninguno de los dos no se puede retirar si
-- se filtra —solo apagarlo a mano cuando alguien se dé cuenta—. Los dos
-- números se cambian con un update.
-- --------------------------------------------------------------------
insert into coupons (code, descuento_pct, max_usos, caduca_at, event_id, nota)
values ('CREADORES', 100, 10, '2026-10-31 23:59:59-04', null,
        'Cena de creadores. Compartido, un uso por persona.')
on conflict (code) do nothing;
