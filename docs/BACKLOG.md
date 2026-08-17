# Backlog

Lo que está decidido y no toca ahora. Cada uno con por qué espera, para que
retomarlo no sea volver a discutirlo.

---

## 0 · Las opciones del cuestionario, texto y código juntos

**Prioridad alta.** No por lo que rompe hoy, sino por lo que puede romper sin
que nadie se entere.

**El problema.** En `public/Aro Club - Cuestionario.dc.html` cada pregunta
tiene sus textos en `renderVals` y sus códigos en `COD`, en dos listas
separadas. `aCodigo()` traduce **por posición**: la opción 3 de la pantalla se
guarda como el código 3 de `COD`.

Hay un candado —`revisarCodigos()`— que compara longitudes y grita en consola
si no cuadran. Cubre el caso común: añadir o quitar una opción y olvidar la
otra lista.

**Lo que el candado NO puede ver es un reordenamiento:**

```
opciones: ['Escucho', 'Depende', 'Suelo llevar']   ← 3
COD.rol:  ['escucha', 'lleva',   'depende']        ← 3   pasa el candado
```

Tres y tres. Y quien marca «Depende del momento» queda guardado como `lleva`.
El reparto lo sienta como el que lleva la conversación. Sin error, sin
validación fallida, sin nada visible en ninguna pantalla. Se descubre meses
después mirando por qué una mesa no cuadró.

Pasó de verdad al mover «Depende del momento» al final el 17 de agosto: hubo
que acordarse de mover las dos listas a mano. Si se hubiera movido solo una,
no se habría notado.

**La solución.** Que no haya dos listas. Cada opción como
`{ texto: 'Depende del momento', codigo: 'depende' }` en un solo sitio, y
`aCodigo` leyendo el código de la propia opción en vez de contando posiciones.
Reordenar deja de poder desincronizar nada, porque no hay nada separado que
desincronizar. Y `revisarCodigos()` sobra.

Son las 16 preguntas con código: `arraigo`, `sector`, `momento`, `rol`,
`motivo`, `romance`, `actividades`, `temas`, `evitar`, `planes`, `peso`,
`gasto`, `dieta`, `zonas`, `dias`, `idiomas`.

**Ojo al hacerlo:** las respuestas ya guardadas son slugs (`"depende"`), no
índices, así que **no hay que migrar datos**. Es un cambio de cómo la pantalla
traduce, no de lo que hay en la base. Y `zonas` es un caso aparte: su orden lo
manda `/api/zonas` en tiempo de ejecución y lleva una opción de más
—«Cualquier zona de la ciudad»— que a propósito no tiene código.

**Por qué espera.** Es tocar las 16 preguntas de la pantalla que más datos
produce, y hacerlo a medias —la mitad emparejada y la mitad por posición— es
peor que el estado de hoy. Necesita una sesión entera y comprobar el guardado
de cada pregunta después, no un rato entre otras cosas.

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
