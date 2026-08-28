# Entrega 16 · Encuesta del día después

Rediseño completo de `/mi-mesa#pasada` (la pantalla existía, funcionaba y guardaba bien, pero tenía cero respuestas: no hay ningún correo que lleve a ella — hasta esta entrega).

## 1 · Qué cambió de fondo

Se retiró la pasada por las cinco personas ("¿coincidirías de nuevo con Daniela?"). No sirve: esa combinación de seis nunca se repite, y el veto de tres meses ya evita que se vuelva a juntar. El único dato usable es el negativo (bloqueo), y quién asistió lo marca operación.

## 2 · Los cuatro bloques, en orden

1. **¿Qué tal la mesa que armamos para ti?** — una escala sobre el grupo entero (Excelente/Bien/Regular/Mala), nunca por persona.
2. **¿Qué tal el sitio?** — rejilla de 4 filas × misma escala (Excelente/Bien/Regular/Mal): Ambiente, Servicio, "Se podía conversar" (así se pregunta el ruido — encaja en la escala sin sonar raro), Comida. Las cuatro comparten exactamente las mismas opciones para que se lea como una sola barrida, no cuatro preguntas.
3. **¿Volverías a Aro Club?** — sí/no. Es la pregunta que falta hoy: la única existente medía "volverías a esa mesa", que no decide nada.
4. **¿Alguien con quien preferirías no volver a coincidir?** — los 5 nombres de trato (nunca apellido), ninguno premarcado, saltarla es lo normal.

Reportar bajó a enlace discreto siempre visible ("¿Pasó algo grave? Reportarlo →"), fuera de la tarjeta — no es un paso del flujo.

Todo opcional, incluido el bloque entero. Nota en pantalla: "Pensado para cenas. Un café o una salida de movimiento se van a preguntar distinto más adelante."

## 3 · El correo (plantilla 16)

Mismo ancho/escala tipográfica que las 15 existentes. Sale la mañana siguiente a la cena. Tono deliberado: "unos toques, nada más" (no cuenta preguntas), "se contesta hoy por la mañana... después ya no cuenta para el emparejamiento" (la restricción manda, no es un plazo suave). Enlaza a `/mi-mesa#pasada`.

## 4 · Archivos

- `Aro Club - Mi mesa.dc.html` — pantalla completa (todas las fases, no solo #pasada)
- `correos/16-encuesta-despues.html`
- `support.js`
