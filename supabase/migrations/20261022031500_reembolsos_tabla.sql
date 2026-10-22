-- La tabla de solicitudes. En su propia migración porque Postgres no deja
-- usar un valor de enum recién creado en la misma transacción que lo crea.
create table if not exists refund_requests (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references profiles(id) on delete cascade,

  -- El abono concreto que se devuelve, y el apunte negativo que lo saca del
  -- saldo. Los dos `set null`: si algún día se limpia el libro, la solicitud
  -- sigue contando lo que pasó.
  credito_id      uuid references credit_ledger(id) on delete set null,
  salida_id       uuid references credit_ledger(id) on delete set null,

  -- A dónde se manda. Los mismos campos que pide pagar.
  telefono        text not null,
  cedula          text not null,
  banco           text not null,

  /**
   * El monto se fija AL SOLICITAR, no al pagar.
   *
   * Michael: «la tasa es del día que recibimos la solicitud y debe marcarse
   * al momento de solicitarlo, así sabe cuánto va a recibir». Si se calculara
   * al pagar, la cifra que le prometimos y la que recibe serían distintas, y
   * la diferencia la descubre él en su banco.
   */
  precio_usd      numeric(10,2) not null,
  tasa            numeric(14,4) not null,
  monto_ves       numeric(14,2) not null,

  estado          text not null default 'pendiente',
  solicitado_at   timestamptz not null default now(),

  -- Lo que rellena operación al pagar: los mismos datos que pide un pago,
  -- comprobante incluido. Sin comprobante no se marca: la referencia sola es
  -- lo que se escribe mal y después no hay nada que rastrear.
  reembolsado_at  timestamptz,
  reembolsado_por uuid references profiles(id) on delete set null,
  referencia      text,
  comprobante_path text,

  constraint refund_requests_estado check (estado in ('pendiente', 'reembolsado'))
);

-- Un crédito no se puede pedir dos veces. Parcial porque un crédito ya
-- reembolsado tampoco vuelve: lo que se impide es la solicitud repetida.
create unique index if not exists refund_requests_un_credito
  on refund_requests (credito_id)
  where credito_id is not null;

create index if not exists refund_requests_pendientes
  on refund_requests (solicitado_at desc)
  where estado = 'pendiente';

comment on table refund_requests is
  'Quien se quedó sin mesa y prefiere el dinero al crédito. El monto y la '
  'tasa se fijan al solicitar y no se vuelven a tocar.';

alter table refund_requests enable row level security;
