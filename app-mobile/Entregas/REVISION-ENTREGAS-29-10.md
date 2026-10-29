# Revisión de las entregas de Design · noche del 29-10

Las abrí en el navegador y saqué captura de cada pantalla, a tamaño real. Las
dos están bien hechas y siguen el brief. Lo que encontré:

## «Cómo funciona» (`Entregas/entrega como-funciona/`)

**Bien:** las tres tarjetas, con sus fotos de cena; el panel de color para el
brunch y los planes de movimiento; la voz «grupo» y «punto de encuentro»; la
fila en la hoja de reservar y en Mi mesa, y la web.

**A corregir (los corrijo yo al construirla, no hace falta Design):**
1. **El paso a paso son 7 momentos, no 8.** Su cuadro «Lo corto resume a lo
   largo» todavía tiene «La voz de Aro», que se quitó.
2. **El brunch no se revela «temprano»,** sino a las 6:00 p.m. del día antes.
   La app toma la hora del servidor: en la app no se escribe a mano.
3. **«El día de la cena, al mediodía»** también sale de la hora real de la
   fecha, no escrito.
4. **Cuándo se abre sola:** Design dice «si pagó por transferencia, espera a
   la confirmación». Desde esta noche se celebra al reportar el pago, así que
   se abre en ese momento.
5. **«Se guarda en la cuenta, no en el teléfono»:** para eso hace falta un
   campo en el servidor. Mientras no lo haya, la app lo recuerda en el
   teléfono.
6. Los dos avisos de fotos que no cargan, que Design ya vio, no son nada. Son
   las plantillas antes de pintarse; las fotos sí cargan.

**Textos (los apruebas tú):** los tres que propuso. «Durante» ya dice «Si se
acaba el tema, el juego de la mesa está en la app», así que no hace falta
añadir nada. Solo sugiero cambiar el «Y si alguien te cayó bien, díselo» de
«Después» por **«Y si alguien te cayó bien, márcalo en la encuesta»**, ahora
que existe «seguir en contacto».

## El juego por temáticas (`Entregas/entrega tematicas/`)

**Bien:** elegir la temática con su color, sus estados (nueva, a medias,
jugada), la portada, la pregunta en grande con «Pregunta 2 de 5», el final
con lo que queda y «Ahora, a conversar», y la tarjeta en Mi mesa. Sin la
regla de quién lee: solo «Si a alguien no le provoca, pasa».

**A corregir:**
1. **La tarjeta de Mi mesa dice «8 momentos».** Son 7. La app lo cuenta sola.
2. **Las temáticas jugadas quedan con poco contraste** (por ejemplo «Rápido y
   ligero» jugada, en melocotón claro). Se leen mal con la luz de un
   restaurante. Las construyo un poco menos apagadas.
3. **«¿Y si...?» con tres puntos.** Va con el carácter «…».

**Lo que decides tú: los nombres y las preguntas.** Design propuso «Rápido y
ligero», «Lo que te mueve», «Historias», «¿Y si…?» y «Para cerrar», con
preguntas de ejemplo. Yo propuse otras en `JUEGO-v3-tematicas.md`. Mi
recomendación es mezclar:
- **Sus nombres** son mejores que los míos.
- **Mis preguntas,** que ya están aprobadas casi todas y no son profundas.
  Y su «¿Arepa de qué?», que es buenísima.
- **Ojo con «Lo que te mueve»** («¿A quién le pides consejo y por qué?», «¿Qué
  no negocias en una amistad?»): es lo más parecido a lo profundo de lo que se
  quejó la gente.
- **Ojo con «Para cerrar»** («¿Qué te sorprendió de alguien hoy?»): pide hablar
  de alguien de la mesa delante de esa persona.

## Lo que hago con esto

Construyo las dos en la rama de la app, sin publicar. **El juego de las cenas
de mañana no se toca:** la app sigue con el juego de rondas hasta que el mazo
nuevo esté aprobado y en `reglas.js`, que es donde lo leen la app y la web.
