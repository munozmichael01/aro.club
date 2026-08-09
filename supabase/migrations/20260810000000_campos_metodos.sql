-- Las claves de los campos las manda la pantalla, no mi semilla: el
-- reporte se guarda con la clave con la que se pregunta, y operacion busca
-- en el banco por esa misma clave. Zelle da un CODIGO alfanumerico y no
-- una referencia numerica, pero en el reporte viaja como `ref` igual que
-- en pago movil, porque en los dos casos es "el numero que te dio quien
-- movio el dinero".
update payment_methods set campos = '[
  {"campo":"titular","etiqueta":"Nombre del titular que envió","requerido":true},
  {"campo":"contacto","etiqueta":"Correo o teléfono desde el que enviaste","requerido":true},
  {"campo":"ref","etiqueta":"Código de confirmación","requerido":true},
  {"campo":"fecha","etiqueta":"Fecha del pago","requerido":true}
]'::jsonb where id = 'zelle';

-- Los datos de NUESTRA cuenta. Estos son de ejemplo y hay que sustituirlos
-- por los de verdad antes de cobrarle a nadie: mientras esten asi, la
-- pantalla enseña donde pagar y el dinero no llega a ninguna parte.
update payment_methods set datos_cuenta = '{
  "pendiente_de_datos_reales": true,
  "Banco": "0134 · Banesco",
  "Documento": "J-40551234-8",
  "Teléfono": "0412 555 0134"
}'::jsonb where id = 'pm' and datos_cuenta = '{}'::jsonb;

update payment_methods set datos_cuenta = '{
  "pendiente_de_datos_reales": true,
  "Correo Zelle": "pagos@aro.club",
  "A nombre de": "Aro Club LLC"
}'::jsonb where id = 'zelle' and datos_cuenta = '{}'::jsonb;

update payment_methods set datos_cuenta = '{
  "pendiente_de_datos_reales": true,
  "Teléfono": "+34 611 22 33 44",
  "A nombre de": "Aro Club"
}'::jsonb where id = 'bizum' and datos_cuenta = '{}'::jsonb;
