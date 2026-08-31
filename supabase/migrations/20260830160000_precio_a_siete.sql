-- El puesto pasa de 8 a 7 USD.
--
-- Solo las fechas que NO han pasado y el producto de referencia. Las fechas
-- viejas se quedan con lo que se cobro de verdad: cambiarlas reescribiria lo
-- que pago la gente, y eso es lo que se cuadra contra el banco.
--
-- El precio de cada fecha manda sobre todo lo demas —`events.price_usd` es lo
-- que se cobra— y lo que se ENSEÑA cuando no hay fecha delante vive ahora en
-- `AroReglas.PRECIO_USD`, un solo sitio en vez de siete.

update events
set price_usd = 7
where starts_at > now() and status <> 'cancelled' and price_usd = 8;

update products set price_usd = 7 where sku = 'single_dinner';
