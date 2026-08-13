-- Pago Móvil, Zelle y Bizum cobrando, con datos de prueba declarados.
--
-- Estaban encendidos pero la API los degradaba a «Pronto» porque su cuenta
-- era inventada: un Banesco `0412 555 0134` que me saqué de la manga y que
-- en pantalla no se distinguía de una cuenta real. Apagarlos evitaba el
-- desastre, pero también hacía imposible probar el pago entero.
--
-- Lo que protege no es esconder unos datos falsos: es que se lea «esto es
-- de prueba, no envíes dinero» justo encima del número. Eso ya lo hace la
-- pantalla mientras `pendiente_de_datos_reales` siga puesto.
--
-- Aquí los números pasan de creíbles a imposibles. Un `0000 000 0000` no
-- se transfiere por accidente; un `0412 555 0134` sí.
--
-- CUANDO LLEGUEN LOS DATOS DE VERDAD: se sustituyen los valores y se quita
-- `pendiente_de_datos_reales`. El aviso desaparece solo.

update payment_methods
   set datos_cuenta = jsonb_build_object(
         'Banco', '0000 · Banco de pruebas',
         'Documento', 'J-00000000-0',
         'Teléfono', '0400 000 0000',
         'pendiente_de_datos_reales', true
       ),
       activo = true
 where nombre = 'Pago Móvil';

update payment_methods
   set datos_cuenta = jsonb_build_object(
         'A nombre de', 'ARO CLUB (PRUEBAS)',
         'Correo Zelle', 'pruebas@ejemplo.invalid',
         'pendiente_de_datos_reales', true
       ),
       activo = true
 where nombre = 'Zelle';

update payment_methods
   set datos_cuenta = jsonb_build_object(
         'A nombre de', 'ARO CLUB (PRUEBAS)',
         'Teléfono', '+34 600 000 000',
         'pendiente_de_datos_reales', true
       ),
       activo = true
 where nombre = 'Bizum';

comment on column payment_methods.datos_cuenta is
  'Nuestra cuenta, tal cual se enseña. Si lleva pendiente_de_datos_reales, '
  'la pantalla avisa encima de que son datos de prueba y que no se envie '
  'dinero. Quitar esa marca es lo ultimo que se hace antes de cobrar de '
  'verdad: sin ella, el aviso desaparece.';
