-- El pack de 4 se apaga, y se queda entero.
--
-- `pack_4` lleva desde el primer día en el catálogo, activo, a 28 USD y con
-- `credits_granted = 4`. Nunca lo vendió nadie: no hay pantalla de compra ni
-- ruta que conceda créditos. Un producto activo que no se puede comprar es
-- una promesa esperando a que alguien la encuentre.
--
-- Hoy el modelo es el que ya dice el legal —«pagas cuando reservas»— y un
-- crédito solo nace al cancelar con más de 24 horas.
--
-- NO SE BORRA. La fila, el precio y los créditos que otorga quedan como
-- están, y `credit_reason_t` ya tiene 'pack_purchase'. El día que se decida
-- vender packs, esto se enciende con:
--
--     update products set is_active = true where sku = 'pack_4';
--
-- y lo que falta construir es: la pantalla de compra, un pago ligado a un
-- producto en vez de a una fecha —`payments.product_id` ya existe— y que la
-- conciliación anote los créditos en el libro mayor.

update products set is_active = false where sku = 'pack_4';

comment on table products is
  'Catalogo de lo que se cobra. Hoy solo se usa el precio por cena; el '
  'pack_4 esta apagado a proposito porque no hay flujo de compra que lo '
  'venda. Encenderlo sin construir ese flujo publica un producto que nadie '
  'puede pagar.';
