-- La tasa pasa a ser la del EURO, y la columna deja de mentir.
--
-- Michael, 13-10: en Venezuela el precio se dice en «ref», y cada
-- establecimiento decide si cobra a tasa dólar o a tasa euro, las dos del
-- BCV. Aro cobra a tasa euro.
--
-- La columna se llamaba `usd_to_ves`. Dejar ese nombre con la tasa del euro
-- dentro es exactamente la clase de mentira que este esquema ya ha pagado:
-- el número sería correcto, el nombre diría otra cosa, y dentro de tres meses
-- alguien calcularía con él creyendo que son dólares.
--
--   usd_to_ves  →  ves_por_ref   bolívares por cada «ref»
--   moneda                        con QUÉ tasa del BCV se calculó
--
-- `moneda` nace en 'USD' para las filas que ya están: se calcularon con la
-- tasa del dólar y eso no se reescribe. Las nuevas las escribe el cron en
-- 'EUR'. Así cada cobro de la historia dice con qué se calculó, que es lo
-- único que permite responder «¿por qué pagué esto?» dentro de un año.
--
-- Hoy: dólar 876,80 · euro 982,00. Doce por ciento de diferencia, y sobre
-- diez ref son 9.820 bolívares en vez de 8.768.
alter table fx_rates rename column usd_to_ves to ves_por_ref;

alter table fx_rates add column if not exists moneda text not null default 'USD'
  check (moneda in ('USD', 'EUR'));

comment on column fx_rates.ves_por_ref is
  'Bolívares por cada ref. La tasa oficial del BCV de la moneda que diga '
  '`moneda`: desde el 13-10 se cobra con la del EURO.';
comment on column fx_rates.moneda is
  'Con qué tasa del BCV se calculó esta fila. Las anteriores al 13-10 son '
  'USD y no se reescriben: ese fue el cambio con el que se cobró.';
