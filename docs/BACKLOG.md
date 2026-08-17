# Backlog

Lo que está decidido y no toca ahora. Cada uno con por qué espera, para que
retomarlo no sea volver a discutirlo.

---

## 1 · El embudo tiene una sola puerta

**El problema.** El correo solo se pide en la landing, en el bloque
`#registro`. Cualquier otra entrada rebota:

- «Empieza aquí» desde Entrar te manda a la landing… y **el ancla no baja**.
  Comprobado: el bloque está a 14.848 píxeles y la página se queda arriba.
  La landing no scrollea en la ventana sino dentro de un contenedor, así que
  ni `scrollIntoView` la mueve.
- Entrar directo a `/datos` o `/cuestionario` sin sesión ni token rebota a
  Entrar. Ese es el «redirect raro».

Y esto empeora ahora que los correos llevan enlaces: cada correo es una
puerta nueva, y todas dan al mismo sitio.

**La solución, que es de Michael.** Que `/datos` pida el correo cuando llega
alguien sin sesión y sin token, en vez de rebotar. La ruta ya lo admite
—`deQuien()` acepta `correo` además de `token`— así que no hay fontanería
nueva: es un estado más de la pantalla.

Con eso «Empieza aquí» puede ir a `/datos` y el embudo arranca donde
aterrices.

**Por qué espera.** Es una pantalla de Design, y va en el mismo encargo que
la baja de correos y la de Gente. Mientras tanto el enlace sigue apuntando a
`/#registro`, que no baja pero al menos lleva a la página correcta.

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
