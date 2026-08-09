# Para Design · Tres patrones de tus pantallas que perdían datos

Esto no es una queja: son tres cosas que se ven bien en una maqueta y fallan
en cuanto hay una base de datos detrás. Te las cuento porque **son patrones,
no erratas**, y se van a repetir en las próximas entregas si no las tenemos
localizadas.

Las tres estaban en producción con gente real dentro.

---

## 1 · Una respuesta premarcada que nadie guarda

**La pregunta de idiomas venía con "Español" ya marcado.** Es buena idea:
en Caracas es la respuesta de casi todos y ahorra un toque.

El problema es cómo se guarda. El cuestionario guarda **al tocar**, pregunta
por pregunta. Y a una respuesta premarcada nadie la toca.

Resultado: quien no cambiaba el idioma se quedaba en **16 de 17 respuestas**,
y Mi cuenta le pedía terminar el perfil para siempre. Y no podía arreglarlo:
al volver, la pantalla veía el idioma marcado, daba la pantalla por completa
y le dejaba pulsar Terminar sin guardar nada. Bucle cerrado.

Le pasó a un amigo del equipo que había respondido todo. Desde su lado había
respondido todo — y tenía razón.

**Lo arreglé** haciendo que al pasar de pantalla se reenvíe lo que hay en
ella, no solo lo que se tocó.

**Lo que te pido:** cuando pongas un valor por defecto, dilo en el HANDOFF.
Un valor por defecto no es decoración, es una respuesta que alguien tiene que
guardar.

---

## 2 · Una pantalla que no enlazaba nadie

`Datos base` existía desde la entrega 3, con sus cuatro pasos y su resumen
final. **Ninguna pantalla apuntaba a ella**, y no tenía una sola llamada al
servidor. Era imposible llegar, e imposible guardar si llegabas.

No era cosmético. Ahí se piden **fecha de nacimiento y género**, que son las
dos restricciones más duras del reparto: horquilla de diez años y equilibrio
de género. Sin ellas, las dos reglas que más pesan estaban desactivadas para
todo usuario real, y las mesas se habrían armado ciegas justo en lo que más
importa.

Tu propia pantalla lo dice: *"Sin edad no hay spread de 10 años. Sin género
no hay balance 3/3."* Lo tenías clarísimo; lo que faltaba era la puerta.

**Lo arreglé** con un estado nuevo en Mi cuenta (el número 1 de la lista de
componentes) y cableando la pantalla.

**Lo que te pido:** que cada pantalla nueva venga con **desde dónde se llega
y a dónde va**. Una pantalla sin entrada es una pantalla que no existe.

---

## 3 · "OPCIONAL" que no era opcional

Tres preguntas del cuestionario están marcadas OPCIONAL en pantalla: dieta,
temas a evitar y la de romance.

Pero el progreso se contaba sobre las diecisiete. Quien saltaba una opcional
se quedaba en 16 de 17 y **Mi cuenta le pedía terminar el perfil por no
contestar algo que la pantalla le decía que podía saltarse**.

**Lo arreglé** contando solo las catorce obligatorias.

**Lo que te pido:** que "opcional" en pantalla y "opcional" en el contrato
sean el mismo dato. Si una es opcional, no cuenta para el progreso.

---

## Y una del final del recorrido, del mismo tipo

En `Verificación`, el botón decía **"Ir a mi cuenta"** y su enlace era la
landing pública. Quien terminaba de verificarse aterrizaba en la página de
marketing, con "Entrar" y "Empezar" en la cabecera y sin vía de vuelta.

Desde dentro eso no se lee como una página pública: se lee como que te han
echado. Y así lo reportó el usuario — *"lo sacaste de la sesión"*. La sesión
estaba intacta; el enlace no.

Repasé **todas** las pantallas de miembro contrastando el texto de cada
enlace con su destino. Las demás estaban bien; Verificación tenía tres.

---

## Lo único que te pido de verdad

Que en el HANDOFF de cada entrega vengan tres cosas por pantalla:

1. **De dónde se llega y a dónde va cada botón.**
2. **Qué campos se guardan y cuándo** (al tocar, al pasar de pantalla, al
   terminar).
3. **Qué viene premarcado.**

Con eso, las cuatro cosas de arriba no habrían pasado. Y las que se me
escapen a mí, las cazamos antes de que las cace un amigo tuyo.
