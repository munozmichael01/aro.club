# Entrega 18 · El juego de la mesa

Diseño: `Aro Club - Juego de la mesa.dc.html` (en esta carpeta). Siete pantallas de teléfono; la 1a es un prototipo navegable.

## Dónde vive
- Entrada en **Mi mesa**, estado revelada (mAbierta), app y web. Tarjeta al final de la pantalla, debajo de «Con quién cenas» y de la nota de verificación.
- **Cerrado** (1b): fondo #F2E9D5, candado, «Se abre a las 7:00 p.m., media hora antes de la cena». Sin botón.
- **Abierto** (1c): mismo fondo, botón con borde «Abrir el juego». Nunca verde oscuro: la tarjeta de la mesa sigue siendo lo principal.
- La hora de apertura (media hora antes) sale de `reglas.js`, no del texto.

## Pantallas del juego (fondo #14342A en todas)
1. **Reglas** (1d): cuatro líneas, botón «Empezar». Debajo, «¿Ya empezaron? Ronda 2 · Ronda 3» para quien toma el relevo de lector en otro teléfono.
2. **Pregunta** (1e): cabecera «Ronda N · nombre» + «X de 4», barra de 4 segmentos, la pregunta sola en el centro (Young Serif 42 px). Abajo: atrás (círculo 58 px) y «Siguiente» a todo el ancho. No hay «Pasar».
3. **Cambio de ronda** (1f): nombre y bajada de la ronda, la línea para cambiar de lector y «Empezar la ronda N».
4. **Final** (1g): isologo, «Hasta aquí el juego. Lo demás es suyo.», «Ya pueden guardar el teléfono.» y «Volver a Mi mesa».

## Comportamiento
- Las preguntas salen de `AroReglas.JUEGO`; el orden, de una semilla (id de mesa + ronda). Así cualquier teléfono que abra la misma ronda ve las mismas preguntas.
- La X de arriba vuelve a Mi mesa sin confirmación. Al volver a abrir, retoma la última ronda vista en ese teléfono (guardado local).
- Pantalla encendida mientras el juego está abierto: keep-awake en la app, Wake Lock en la web.
- Web: la misma pantalla, centrada a 430 px de ancho sobre #14342A.
- Solo para cenas por ahora. Café y movimiento tendrán su versión.

## Dato de ejemplo vs. definitivo
- Ejemplo: sitio, hora, número de mesa y nombres de Mi mesa.
- Definitivo: todo el copy del juego.
