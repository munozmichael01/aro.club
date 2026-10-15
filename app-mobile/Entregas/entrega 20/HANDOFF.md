# Entrega 20 · Mi mesa: paso a paso, sitios, juego y foto del local

Para la cena del viernes 16 y el sábado 17. App y web.

## Qué hay

- `Aro Club - Mi mesa.dc.html`: la versión final, con todos los estados y las reglas al pie. Es la única que vale; las versiones v1 a v3 que se exploraron no se entregan.
- `correos/03-mesa-asignada.html` y `correos/04-recordatorio.html`: solo cambia que ahora llevan la foto de la entrada del local.
- `fachada-ejemplo.jpg`: foto de ejemplo. En producción se usa la foto de la ficha del local.

## Mi mesa

Orden: tarjeta de la mesa (con la foto de la entrada) → Cómo llegar / Voy tarde → Con quién cenas → Paso a paso → El juego de la mesa → Cancelar mi puesto.

- Las tres tarjetas se despliegan. Al entrar: antes de la cena, abierta Con quién; en curso y terminada, abierto Paso a paso.
- Paso a paso: horas derivadas de la hora de la cena y de hasta cuándo deja la mesa el restaurante. «AHORA» en el momento actual; los pasados en #566A5D. Es una guía, no una orden.
- Enlaces al juego desde «Para romper el hielo» y «Si se acaba el tema»: despliegan la tarjeta del juego.
- Sitios para seguir: hasta tres, dentro de la despedida. Sin distancia o sin mapa, se oculta lo que falte.

## El juego

- La tarjeta está disponible en cualquier momento una vez abierta la mesa. Estado por ronda: Ir / Hecha / n de 2. Se puede ir a cualquier ronda.
- Recuerda dónde quedó, por mesa y en ese teléfono (no se sincroniza). El botón principal retoma («Seguir · ronda 2, pregunta 2»). «Empezar de nuevo» solo con avance.
- Dentro del juego: reglas → preguntas en orden (Atrás / Siguiente) → fin de la ronda 1, que devuelve al paso a paso → pausa antes de la ronda 3, con «Terminar aquí» → final. Sin selector de rondas dentro: para saltar se usa la tarjeta. La X guarda y vuelve.
- Nombres de rondas y número de preguntas: los de JUEGO.md y reglas.js (porRonda).

## Foto de la entrada del local

- Es la foto que operación guarda en la ficha del local.
- **App y web:** va grande en la tarjeta de la mesa, con «Al llegar · Busca esta entrada».
- **Correos 03 y 04:** `<img>` con la URL absoluta de esa foto (`local.foto_entrada_url` en el comentario de la plantilla). En la 03 va bajo la dirección; en la 04 encabeza el bloque de Dónde / Cuándo.
- **Sin foto:** en la app queda solo el texto; en los correos, esas filas no se envían.
- La foto se sirve redimensionada (unos 1200 px de ancho, JPG) para que el correo no pese.

## Pendiente de Michael

«Ahora, a comer.» (fin de la ronda 1) y las bajadas de las rondas en la tarjeta del juego.
