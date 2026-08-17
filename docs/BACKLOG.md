# Backlog

Lo que está decidido y no toca ahora. Cada uno con por qué espera, para que
retomarlo no sea volver a discutirlo.

---

## 1 · El embudo tiene una sola puerta — **hecho el 17 de agosto**

`/datos` pide el correo cuando llega alguien sin sesión y sin llave, en vez
de rebotar a Entrar, y «Empieza aquí» ya apunta ahí. El paso va antes del
primero —es el `-1`— para no correr los índices de los cuatro datos, que
están escritos en el resumen del final.

Una corrección sobre lo que decía esta ficha: `deQuien()` **no** acepta un
correo suelto, exige `correo` + token firmado. Así que el paso nuevo no
llama a `/api/datos-base` sino a `/api/lead`, que es exactamente donde manda
el correo la landing. No hay puerta nueva: es la misma puerta en otro sitio.

Queda pendiente el ancla `/#registro` de la landing —sigue sin bajar— pero
ya no bloquea a nadie, porque el enlace que la usaba ahora va a `/datos`.

---

## 1b · Cualquiera puede pedir la llave de un correo ajeno

`/api/lead` acuña token para **cualquier** dirección, exista ya o no. Con esa
llave, `/datos` abre relleno con el nombre, la edad y el teléfono de quien
sea. Quien conozca el correo de otra persona ve sus datos base.

Esto **ya pasaba** antes del cambio de arriba —se conseguía igual desde la
landing, solo que en dos pasos en vez de uno—, así que no es algo que hayamos
abierto hoy. Pero ahora es la puerta principal del embudo y conviene mirarlo.

**Arreglarlo bien es un enlace mágico**: el token se manda al correo en vez
de devolverlo en la respuesta, y solo entra quien abre ese correo. Eso toca
el embudo entero y añade un paso a todo el mundo para tapar un caso que hoy
exige saberse la dirección de alguien. Es una decisión de producto, no un
parche, y por eso está aquí y no hecho a medias.

---

## 2 · El candado de dominios de prueba, bien hecho

Hoy el remitente bloquea `example.com`, `.org`, `.net`, `prueba.aro.club` y
`test.com`. Los cuatro primeros son reservados y no pueden recibir nunca;
**`test.com` es un dominio real** y alguien podría tener una dirección ahí.

Hay que dejarlo solo en los que no pueden recibir por definición, y
probablemente moverlo a una lista configurable en vez de una constante.

**Por qué espera.** El riesgo real es cero hoy: nadie de Caracas tiene un
correo en `test.com`. Y desactivarlo a medias es peor que la regla de más.

---

## 3 · El nombre, en una sola constante

«Aro» está en 398 sitios de 30 ficheros, más los prefijos del sistema de
diseño (`aro-open`, `aro-rail`), los globales de JavaScript (`AroReglas`,
`AroNav`) y las migraciones.

**Por qué espera.** El nombre ya se decidió y el dominio está comprado, así
que el motivo urgente —poder cambiarlo barato— desapareció. Sigue mereciendo
la pena por higiene, pero no antes que nada que tenga usuarios esperando.

---

## 4 · Cambiar la contraseña estando dentro

Existe recuperarla desde fuera —eso se hizo el 17 de agosto— pero **no hay
forma de cambiarla estando dentro de la cuenta**. Hoy hay que salir y pedir
el correo de recuperación.

**Por qué espera.** Con la recuperación funcionando ya no se pierde ninguna
cuenta, que era lo grave. Esto es comodidad.

---

## 5 · Recibir correo en `hola@aro.club`

El endpoint está escrito y probado con firma —`/api/correo/entrante`—:
guarda el mensaje, lo ata a un perfil si quien escribe es alguien nuestro, y
lo reenvía. Falta el MX de la raíz, el secreto del webhook en producción y
`CORREO_REENVIO`.

**Por qué espera.** Nada, en realidad: está a tres pasos de configuración.
Va cuando Michael diga.
