-- Con qué navegador se llega a la pantalla de verificación.
--
-- LA PREGUNTA QUE VIENE A CONTESTAR. De 29 personas que recibieron el empujón
-- de «te falta verificarte», 26 no subieron la cédula nunca. La sospecha de
-- Michael es que llegan desde el navegador interno de Instagram, donde la
-- cámara y el selector de ficheros fallan a menudo en Android. Hoy no se
-- puede ni confirmar ni descartar: no guardamos el navegador de nadie.
--
-- Lo único que había era `errores_cliente.navegador`, y es una muestra
-- torcida —solo quien tuvo un error— aunque ya dice algo: cuatro de sus
-- errores en `/verificacion` vienen del script que Instagram inyecta.
--
-- SE GUARDA LA FAMILIA, NO EL USER AGENT. 'instagram', 'facebook', 'tiktok',
-- 'webview' o 'normal'. La cadena entera es una huella que identifica un
-- teléfono bastante bien, y para esta pregunta no hace falta: lo que se
-- quiere saber es si la pantalla hay que arreglarla para las apps.
--
-- Se escribe al ABRIR la pantalla, no al subir la foto: quien no consigue
-- subirla es justamente a quien hay que contar.

alter table profiles
  add column if not exists navegador_verificacion text;

comment on column profiles.navegador_verificacion is
  'Familia del navegador con que se abrio /verificacion: instagram, facebook, '
  'tiktok, webview o normal. La familia, NUNCA el user agent entero: para '
  'saber si hay que arreglar la pantalla no hace falta huella de nadie.';
