-- =====================================================================
-- Cuando una pantalla revienta, que se entere alguien.
--
-- Hoy no hay `window.onerror`, no hay captura de promesas rechazadas y
-- ninguna pantalla tiene `<noscript>`. Un error de JavaScript en `/pago` deja
-- la pagina en blanco: la persona se va y en los registros no hay NADA,
-- porque el servidor devolvio 200 con el fichero. Nos enterariamos porque
-- alguien escriba.
--
-- UNA FILA POR ERROR DISTINTO, NO POR VISITA. Una pantalla rota genera un
-- error por cada persona que entra: guardar uno por visita llena la tabla y
-- convierte «que se entere alguien» en cuatrocientos correos. La huella
-- agrupa pantalla + mensaje + sitio del codigo, y lo demas es un contador.
--
-- Y el freno del aviso vive en la misma fila: `avisado_en` dice cuando salio
-- el ultimo correo de ESTE error. Sin eso haria falta otra tabla para lo
-- mismo.
--
-- NADA DE LA PERSONA. Ni correo, ni nombre, ni lo que escribio en un campo.
-- La IP tampoco: se guarda su huella, que sirve para frenar a quien quiera
-- llenarnos el buzon y no sirve para saber quien es.
-- =====================================================================

create table if not exists errores_cliente (
  huella        text primary key,
  pantalla      text not null,
  mensaje       text not null,
  origen        text,
  pila          text,
  navegador     text,
  veces         int not null default 1,
  primera_vez   timestamptz not null default now(),
  ultima_vez    timestamptz not null default now(),
  -- Cuando salio el ultimo aviso por correo de este error concreto.
  avisado_en    timestamptz,
  -- Para que operacion pueda tachar lo ya arreglado sin borrar el historial.
  resuelto_en   timestamptz
);

-- Lo que se mira: lo que sigue roto, lo mas reciente primero.
create index if not exists errores_cliente_vivos
  on errores_cliente (ultima_vez desc) where resuelto_en is null;

-- El freno por IP: cuantos errores DISTINTOS ha abierto esa huella de IP en
-- el ultimo rato. Los repetidos no crean fila, asi que el unico abuso posible
-- es mandar mensajes siempre distintos, y eso es justo lo que cuenta esto.
create table if not exists errores_cliente_ip (
  ip_huella  text not null,
  creado_en  timestamptz not null default now()
);
create index if not exists errores_cliente_ip_ventana
  on errores_cliente_ip (ip_huella, creado_en desc);

alter table errores_cliente    enable row level security;
alter table errores_cliente_ip enable row level security;

-- Solo operacion lee. Escribe la ruta con la llave de servicio: si el
-- navegador pudiera escribir directo, cualquiera llenaria la tabla.
create policy errores_ops on errores_cliente for select using (is_ops());

comment on table errores_cliente is
  'Errores de JavaScript de las pantallas. Una fila por error distinto, con '
  'su contador. Sin datos de la persona: ni correo, ni nombre, ni lo que '
  'escribio en un campo.';
