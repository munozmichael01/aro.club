-- «Avisamos que llegas 20 minutos tarde» no avisaba a nadie.
--
-- El botón está en Mi mesa desde su entrega y la FAQ lo promete en la
-- portada —«avisas desde la app con un toque y se lo decimos a la mesa»—,
-- pero `avisar` solo hacía `setState({ avisado: true })`. La pantalla decía
-- que habíamos avisado y no salía nada, ni a la mesa ni a operación. Quien lo
-- pulsara llegaría tarde a cinco desconocidos a los que nadie dijo nada.
--
-- Decisión de Michael: va por correo a los otros cinco, y solo DESPUÉS de la
-- revelación —antes nadie sabe con quién cena, así que no hay a quién avisar—.
-- Cuando haya app, además, como notificación.

alter type email_kind_t add value if not exists 'llego_tarde';
