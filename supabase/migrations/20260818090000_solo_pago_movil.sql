-- =====================================================================
-- Solo Pago Móvil.
--
-- Zelle y Bizum estaban encendidos desde `20260812090000_metodos_en_pruebas`,
-- que los abrió para poder probar el pago entero con datos declarados como
-- falsos. Esa era la razón: probar. Nunca fue que se cobrara por ahí.
--
-- Se apagan porque no hay cuenta de verdad detrás de ninguno de los dos, y
-- un método encendido es un método al que alguien puede mandar dinero. El
-- aviso de `pendiente_de_datos_reales` protege al que lee; el interruptor
-- protege al que no lee.
--
-- No hace falta tocar código, y ese es el punto: `debito` y `tarjeta` llevan
-- apagados desde el principio y la pantalla ya los pinta atenuados con
-- «Pronto» —no los esconde, porque esconderlos haría creer que no existen— y
-- `/api/pago` devuelve 409 a quien fuerce la petición con un método apagado.
-- Esto solo mueve dos booleanos hasta donde ya sabe llegar el mecanismo.
--
-- Los datos de cuenta se quedan como están. Borrarlos obligaría a volver a
-- escribirlos el día que se enciendan, y siguen marcados como de prueba.
--
-- CUANDO HAYA CUENTA DE VERDAD: se sustituyen los `datos_cuenta`, se quita
-- `pendiente_de_datos_reales` y se vuelve a poner `activo = true`. En ese
-- orden, que es el que deja el aviso puesto hasta el último paso.
-- =====================================================================

update payment_methods
   set activo = false,
       actualizado_en = now()
 where id in ('zelle', 'bizum');
