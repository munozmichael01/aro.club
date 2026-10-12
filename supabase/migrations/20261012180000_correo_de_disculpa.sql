-- Un correo para pedir perdón cuando el error es nuestro.
--
-- Hoy a Daniel Castro le llegó un «Hay que repetir una foto» por un fallo del
-- panel —se le rechazó la selfie cinco segundos después de que llegara, desde
-- una vista que no la tenía— y después el de «identidad verificada». Dos
-- correos que se contradicen, y el primero le pide trabajo que no hace falta.
--
-- Eso hay que poder arreglarlo escribiendo, y escribiendo DESDE LA COLA: si
-- se manda a mano con `enviar()` no queda fila, no se cuenta, no se puede
-- responder a «no me llegó» y no respeta la baja de nadie. Michael pidió
-- justo eso: «que quede registrado como enviado, igual que los demás».
--
-- Se llama por lo que es y no `disculpa` a secas: lo que desmiente es un
-- rechazo de verificación, y el cuerpo lo dice. Una disculpa genérica con el
-- texto en el payload seria copy viviendo fuera de las plantillas, que es lo
-- que este repositorio ya paga caro en otros sitios.

alter type email_kind_t add value if not exists 'disculpa_verificacion';
