-- El telefono de contacto admite cualquier prefijo (§11 de la entrega 10).
--
-- Estaba forzado a movil venezolano en TRES capas —la pantalla, el zod de
-- /api/datos-base y estos dos check— asi que quien escribia desde fuera no
-- podia darse de alta. Y a la vez /api/mi-perfil aceptaba prefijo
-- internacional: el mismo dato con dos reglas, que es exactamente el fallo
-- que el §11 enumera cinco veces.
--
-- Esto solo ENSANCHA lo permitido: todo lo que ya estaba guardado sigue
-- valiendo. Ningun dato se toca.
--
-- E.164: un '+', un primer digito distinto de cero, y entre 8 y 15 cifras
-- en total. Es la misma cuenta que hace AroReglas.telefonoPerfil, para que
-- el navegador y la tabla no puedan discrepar.

alter table waitlist drop constraint if exists waitlist_phone_ve;
alter table waitlist
  add constraint waitlist_phone_e164 check (
    phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
  );

alter table profiles drop constraint if exists profiles_phone_ve;
alter table profiles
  add constraint profiles_phone_e164 check (
    phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
  );

comment on column profiles.phone_e164 is
  'Telefono de contacto en E.164, con el prefijo del pais. Cualquier pais: '
  'hay miembros escribiendo desde fuera. El +58 se pone solo cuando quien '
  'lo teclea no escribe ninguno. No confundir con el telefono de un metodo '
  'de pago, que si es venezolano porque es un dato del banco.';
