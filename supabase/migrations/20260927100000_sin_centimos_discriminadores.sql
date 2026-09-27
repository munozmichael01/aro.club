-- Se retiran los céntimos discriminadores del importe.
--
-- Desde la entrega 9 el monto en bolívares no era 7 por la tasa: llevaba unos
-- céntimos derivados de la persona y la fecha, para poder distinguir dos pagos
-- iguales del mismo día en el extracto del banco.
--
-- Michael lo retira: el pago se reconoce por la REFERENCIA que la persona
-- reporta, que es lo que operación busca de verdad, más el monto. Los céntimos
-- eran un segundo mecanismo para lo mismo y tenían un coste que no compensaba
-- —quien echaba la cuenta veía un descuadre de veinte céntimos, suponía un
-- redondeo mal hecho y transfería «el número bueno», que es justo el que no se
-- puede cuadrar—.
--
-- La columna NO se borra: las filas anteriores llevan su valor y son el
-- registro de cómo se cobró entonces. Deja de escribirse, y queda dicho aquí.
--
-- El índice sí se va. Era `(charge_date, cents_token) where cents_token is not
-- null`, así que escribiendo null ya no aplicaba a nada, pero un índice único
-- vivo sobre una columna que nadie escribe es una trampa esperando a que
-- alguien la reutilice. La guarda contra pagar dos veces el mismo puesto no
-- era este índice —`charge_date` es la fecha de Caracas y cada medianoche
-- dejaba de proteger—: es la comprobación de `/api/pago`, que busca un pago
-- vivo de esa misma reserva antes de insertar.

drop index if exists payments_cents_token_uq;

comment on column payments.cents_token is
  'Retirado el 27 de septiembre de 2026. Los céntimos discriminadores ya no se '
  'escriben: el pago se reconoce por la referencia y el monto. Las filas '
  'anteriores conservan su valor como registro de cómo se cobró entonces.';
