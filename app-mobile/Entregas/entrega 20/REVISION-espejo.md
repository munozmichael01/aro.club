# Revisión del espejo app ↔ web · entregas 20 y 21

Para cuando el agente web diga que terminó. Cada punto se mira en las dos,
con los mismos datos (cuenta del banco de pruebas o catálogo), no leyendo el
código.

## Mi mesa de una cena (entrega 20)

1. Orden: tarjeta de la mesa → (panel de «Voy tarde») → Con quién cenas → Paso a paso → El juego → Cancelar mi puesto.
2. Tarjeta de la mesa:
   - el sello ABIERTO / EN CURSO / TERMINADA, y cuándo cambia;
   - «Viernes 16 · 7:30 p.m.»;
   - MESA y su número (oculto si `mesaUnica`);
   - restaurante y dirección;
   - la foto de 180 px con «AL LLEGAR · BUSCA ESTA ENTRADA», o «AL LLEGAR» solo si no hay foto;
   - «Di que vas a la mesa de Aro, la 04.»;
   - «Cómo llegar» y «Voy tarde».
3. Desplegables:
   - qué tarjeta se abre al entrar (antes de la cena, Con quién; en curso y terminada, Paso a paso);
   - el + y el −;
   - que se respete lo que la persona abre y cierra.
4. Con quién cenas: «5 personas · todas verificadas», las iniciales, el sector y, al final, la nota «Todos con identidad verificada. No hay fotos ni apellidos…».
5. Paso a paso:
   - **dos horas fijas** desde el inicio (sin `cierraMesaEn`);
   - las 8 horas, sin a.m./p.m. en la columna;
   - «Esperamos a todos hasta las 7:45.»;
   - AHORA y su fondo, y los pasados en #566A5D;
   - el resumen cerrado: «8 momentos · de 7:30 a 9:30 p.m.» antes, «Ahora: …» después;
   - los dos enlaces al juego (llenos si es AHORA), y que al tocarlos se despliegue la tarjeta del juego;
   - los sitios para seguir (todavía no hay datos: solo la frase).
6. Copy, palabra por palabra, contra `app-mobile/src/texto/mesa.ts` (`guion`, `cena`) y `src/texto/juego.ts` (`tarjeta`).

## El juego (entregas 20 y 21)

7. Antes de la hora de la cena (1a):
   - las rondas al 45 %, sin «Ir»;
   - el candado y «Se abre a las 7:30 p.m., a la hora de la cena.»;
   - la línea «3 rondas · se abre a la hora de la cena»;
   - la tarjeta no se despliega.
8. Abierto: «Ir», «Hecha» y «n de 2»; «Empezar la ronda 1» / «Seguir · ronda 2, pregunta 2»; «Empezar de nuevo» solo si hay avance.
9. Jugado (1b y 1c): «Jugado · N de 3 rondas», «Hecho», la frase final y «Volver a jugar», que reabre las rondas en «Ir».
10. Dentro del juego: reglas (4g, con la regla 4 «Tres rondas, de menos a más.»), pregunta (4h, con «Empieza quien leyó. Se puede pasar.»), «Ahora, a comer.» (4e), la pausa antes de la ronda 3 (4j) y el final (4k).
11. La X guarda y vuelve. El avance se guarda por mesa en el dispositivo: cerrar y volver retoma en la misma pregunta.
12. La pantalla no se apaga mientras el juego está abierto (Wake Lock en la web).

## Brunch (entrega 21)

13. Agenda: la polaroid del brunch (giro 1.6deg), el icono del sol y el color (#8F4515 sobre rgba(227,156,99,.24)). El mosaico de «Todos» en 2 × 2.
14. Voz: «Con quién vas», «Estuviste en» y «Vas con cinco personas.» en lo que no es una cena.

## Correos

15. 03: la foto bajo la dirección; sin foto, sin esas filas.
16. 04: la foto solo si la mesa ya está abierta.
17. 23: los ejemplos de mezcla y de cuatro o más, comparados con los de Design, en seco.
