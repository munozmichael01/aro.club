-- Una mesa en inglés, y el candado que la sostiene.
--
-- Michael aprobó el 20-10 una sola cena «Dinner in English» el sábado 24. No
-- es una traducción de la web ni un idioma de la cuenta: es una propiedad de
-- LA FECHA, igual que la edad mínima. Esa mesa se habla en inglés y quien se
-- siente tiene que poder seguirla.
--
-- Nulo es lo de siempre, español. Se guarda el código del idioma y no un
-- booleano `en_ingles` porque el día que haya una en portugués —hay veinte
-- personas que lo marcaron— la columna ya sirve y no hay que añadir otra.
--
-- El candado va en las TRES puertas, no solo en reservar: `/api/reservar`,
-- `/api/pago` y `/api/cupon`. Es la misma lección que la verificación y que
-- el permiso de grabación: quien entra por pago o por cupón se salta la
-- primera puerta, y una regla que solo vigila una de las tres no es una
-- regla.
--
-- Lo que decide si alguien cabe es su respuesta a `idiomas` del
-- cuestionario, que es donde ya está el dato. Quien no marcó inglés lo añade
-- en sus respuestas y se apunta: no se le cierra la puerta, se le pide un
-- clic.

alter table events add column if not exists idioma text;

comment on column events.idioma is
  'Idioma en que se habla esa mesa. Nulo = español. Se cruza con la respuesta `idiomas` del cuestionario en reservar, pago y cupon.';

-- Y el tipo de correo del anuncio. Uno solo, a mano, desde operación.
--
-- Tipo propio y no `mensaje`: el de mensaje es texto libre escrito por una
-- persona, y este tiene plantilla, va a una lista calculada y lleva su
-- cabecera de baja. Mezclarlos seria perder la cuenta de a quien se le
-- conto que.
alter type email_kind_t add value if not exists 'cena_en_ingles';
