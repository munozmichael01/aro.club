-- De dónde salió cada cuenta.
--
-- La atribución vivía SOLO en `waitlist.source` y `waitlist.variant`, y
-- `convertir_lead` no la lleva a `profiles`. O sea que quien crea la cuenta
-- sin pasar por un lead —cualquiera que entra directo con Google, y toda la
-- app cuando el alta empiece por las preguntas— no tiene atribución ninguna.
-- Ya está pasando hoy, no es algo que traiga la app.
--
-- Lo encontró el agente de la app preguntando qué pasaba con su `origen:
-- 'app'` si la cuenta se creaba sin lead. La respuesta era: se pierde. Y la
-- de Google también, desde siempre.
--
-- Se copia del lead cuando hay lead, y se escribe directo cuando no. Es texto
-- libre a propósito, igual que `waitlist.source`: una restricción aquí y otra
-- allá divergirían, y el día que haya un canal nuevo se añade en un sitio.

alter table profiles
  add column if not exists source text;

comment on column profiles.source is
  'De donde salio esta cuenta: landing, datos, app... Se copia del lead si lo '
  'hubo, y si no se escribe al crearla. `waitlist.source` guarda lo mismo para '
  'quien todavia no tiene cuenta.';
