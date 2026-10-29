-- Referidos. Michael, 29-10: 20% para quien llega, una reserva gratis por
-- cada 3 personas que vayan a su PRIMERA cena, sin tope por ahora.
--
-- NO SE CREA UNA TABLA DE CÓDIGOS.
--
-- El código de referido es un cupón, y los cupones ya existen con todo lo que
-- hace falta: el campo de Pago, el descuento por porcentaje, el contador de
-- usos y —lo que de verdad importa— el único de `coupon_redemptions`, que es
-- lo que impide que la misma persona lo canjee cada semana. Una tabla nueva
-- sería ese candado escrito por segunda vez.
--
-- Lo único que le falta a `coupons` es de quién es el código. Eso son dos
-- columnas, no una tabla.

alter table coupons
  -- Quién lo reparte. `null` en los cupones de siempre, que no son de nadie.
  add column if not exists creado_por uuid references profiles(id) on delete set null;

comment on column coupons.creado_por is
  'De quién es este código, cuando es de referido. Nulo en los cupones '
  'normales, que los crea operación y no premian a nadie.';

-- Para «dame el código de esta persona» sin recorrer la tabla, y para que no
-- pueda tener dos.
create unique index if not exists coupons_uno_por_persona
  on coupons (creado_por) where creado_por is not null;

-- Y de quién vino cada persona.
--
-- Separado de `source`, que ya existe y dice por qué CANAL llegó
-- —instagram, boca a boca—. Esto dice QUIÉN la trajo, y hacen falta las dos:
-- el canal no se deduce de la persona ni la persona del canal.
alter table profiles
  add column if not exists invitado_por uuid references profiles(id) on delete set null;

comment on column profiles.invitado_por is
  'Quién la invitó, si llegó con un código de referido. El canal sigue en '
  '`source`: son dos preguntas distintas.';

create index if not exists profiles_invitado_por on profiles (invitado_por);

-- Lo que ya se premió, para no premiar dos veces.
--
-- La recompensa se da por CADA TRES personas que asisten, y la asistencia se
-- marca de a una. Sin esta cuenta, el tercero daría un crédito y el cuarto
-- otro, porque «tres o más» sigue siendo cierto. Aquí se guarda cuántos
-- premios ya se dieron, y se compara con `asistidos / 3`.
alter table profiles
  add column if not exists premios_referido int not null default 0;

comment on column profiles.premios_referido is
  'Cuántas reservas gratis se le han dado ya por referidos. Se compara con '
  'floor(asistidos / 3) para saber si toca otra.';
