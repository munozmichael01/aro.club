-- Y con qué TELÉFONO se llega a la pantalla de verificación.
--
-- La familia de navegador ya se guardaba y en unas horas dio el primer dato:
-- de 22 personas que abrieron `/verificacion`, DIEZ venían del navegador
-- interno de Instagram, y de esas subió la mitad frente a dos tercios del
-- resto.
--
-- Falta la otra mitad de la pregunta. El fallo del selector de ficheros y de
-- la cámara dentro de una app es sobre todo de ANDROID: en iOS el mismo
-- navegador suele abrirlos. Sin esta columna, «lo arreglamos para Instagram»
-- puede ser en realidad «lo arreglamos para Instagram en Android», y eso
-- cambia qué se arregla.
--
-- Como la otra: la FAMILIA del aparato, nunca el user agent entero, que
-- identifica un teléfono bastante bien y aquí no hace ninguna falta.

alter table profiles
  add column if not exists dispositivo_verificacion text;

comment on column profiles.dispositivo_verificacion is
  'ios, android, escritorio u otro: con que aparato se abrio /verificacion. '
  'Va con navegador_verificacion y por el mismo motivo: saber si hay que '
  'arreglar la pantalla, sin guardar huella de nadie.';
