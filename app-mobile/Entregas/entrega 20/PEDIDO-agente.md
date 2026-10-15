# Entrega 20 · pedido al agente (web y servidor)

Design entregó la 20 en `app-mobile/Entregas/entrega 20/` (lee primero su `HANDOFF.md` y la maqueta `Aro Club - Mi mesa.dc.html`). Es para la cena del **viernes 16**. Michael quiere el diseño **100 % fiel y espejo exacto entre app y web**. Yo hago la app; tú, el servidor, la web y los correos.

## 1 · `/api/mi-mesa`, campos nuevos (solo se añaden, nada cambia de forma)

- `fotoEntrada: string | null`: URL absoluta de la foto de la entrada del local (`restaurants.facade_photo_path`), **redimensionada a unos 1200 px de ancho, JPG**. La misma URL sirve para la app, la web y los correos.
- `cierraMesaEn: string | null`: hasta qué hora nos deja la mesa el restaurante. Si no hay dato, `null` (el paso a paso usa dos horas).
- `paraSeguir: [{ nombre, minutosAPie, mapa, mapaApple }]`, hasta 3. Son los `restaurants` con `is_after_venue` que operación elige en la ficha de cada local, con los minutos a pie. Falta una tabla de relación y el selector en la ficha del panel. Si el local no tiene ninguno: `[]`.

Para el viernes, lo imprescindible es `fotoEntrada`. Los otros dos pueden llegar después: la app ya funciona sin ellos.

## 2 · Correos 03 (mesa asignada) y 04 (recordatorio)

Los dos ficheros de la entrega solo cambian en eso: la foto de la entrada. En la 03 va bajo la dirección; en la 04 encabeza el bloque de Dónde y Cuándo. `<img>` con la URL absoluta (`local.foto_entrada_url` en el comentario de la plantilla). **Sin foto, esas filas no se envían.** Prueba en seco antes de encolar nada.

## 3 · La web: Mi mesa, fase abierta, calcada de la maqueta

En una columna centrada de 440 px. Va igual que la app, de arriba abajo:

1. **Tarjeta de la mesa (verde).**
   - Arriba, el sello: `ABIERTO` antes de la cena, `EN CURSO` desde la hora de la cena y `TERMINADA` desde la despedida. A la derecha, «Viernes 16 · 7:30 p.m.».
   - Debajo, MESA y su número (sin número si `mesaUnica`), el restaurante y la dirección.
   - La foto de la entrada, de 180 px de alto, con «AL LLEGAR · BUSCA ESTA ENTRADA» y «Di que vas a la mesa de Aro, la 04.». Sin foto, solo el texto.
   - Dentro de la tarjeta, «Cómo llegar» y «Voy tarde».
2. **Tres tarjetas que se despliegan: Con quién cenas, Paso a paso y El juego de la mesa.**
   - Al entrar, antes de la cena se abre Con quién; en curso y terminada, Paso a paso. Nunca las tres abiertas a la vez.
   - Lo que la persona abra o cierre se respeta mientras siga en la pantalla.
   - Cada cabecera cerrada resume lo que tiene dentro:
     - Con quién cenas: «5 personas · todas verificadas».
     - Paso a paso, antes de la cena: «8 momentos · de 7:30 a 9:30 p.m.».
     - Paso a paso, en curso: «Ahora: Para romper el hielo».
     - Paso a paso, terminada: «Ahora: Despedida · 3 sitios para seguir».
     - El juego: «3 rondas · la primera va con la comida».
3. **Paso a paso.**
   - Las horas, contando desde la hora de la cena: llegada +0; «La voz de Aro» y «A pedir» +15; vuelta rápida +20; romper el hielo +35; si se acaba el tema +60.
   - Contando desde el cierre: «Lo último y la cuenta» a cierre −30; despedida al cierre. El cierre es `cierraMesaEn`, o +120 min si no viene o si queda a menos de 90 min del inicio.
   - El momento actual lleva «AHORA» y fondo `#F2E9D5`; los pasados van en `#566A5D`.
   - Enlaces al juego: «Abrir el juego · ronda 1» y «Seguir el juego · rondas 2 y 3». Van llenos si el momento es AHORA y con borde en los demás. Al tocarlos se despliega la tarjeta del juego.
   - Sitios para seguir, hasta 3, en la despedida: sin distancia se oculta esa línea; sin mapa, el botón.
   - El copy y la lógica, idénticos a la app: `app-mobile/src/texto/mesa.ts` (`guion`) y `app-mobile/src/mesa/guion.ts`. **Si puedes, súbelos a `reglas.js` (`AroReglas.GUION`)** y la app pasa a leerlos de ahí, como con `MAX_TEXTO`.
4. **El juego en Mi mesa.**
   - Cada ronda muestra su estado: «Ir», «Hecha» o «n de 2» (el 2 sale de `porRonda`).
   - Se puede ir a cualquier ronda, adelante o atrás.
   - El botón principal es «Empezar la ronda 1» o, si hay avance, «Seguir · ronda 2, pregunta 2». «Empezar de nuevo» solo aparece cuando ya hay avance.
   - Se guarda **por mesa, en ese navegador** (`localStorage`), sin sincronizar.
   - Disponible siempre que la mesa esté abierta, ya sin ventana de horario.
5. **Dentro del juego (4g, 4h, 4e, 4j, 4k):**
   - Las pantallas, en orden: reglas → preguntas con Atrás y Siguiente → fin de la ronda 1 («Ahora, a comer.», que devuelve al paso a paso) → pausa antes de la ronda 3, con «Terminar aquí» → final.
   - Sin selector de rondas dentro del juego.
   - La X guarda y vuelve.
   - En la pregunta, «Empieza quien leyó. Se puede pasar.».
   - Pantalla encendida mientras el juego esté abierto (Wake Lock).
6. «Cancelar mi puesto», al final.

**Las bajadas de las rondas en la tarjeta del juego, provisionales** (Michael tiene pendiente aprobarlas): «Ligera. Luego, a comer.», «Si la mesa va bien sola, no hace falta.» y «Más personal. Cualquiera puede pasar.». La línea «cuándo» de cada ronda:
- ronda 1: «MIENTRAS LLEGA LA COMIDA · 8:05 P.M.» (la hora es la de «Para romper el hielo»);
- ronda 2: «SI SE ACABA EL TEMA»;
- ronda 3: «SOLO SI A LA MESA LE PROVOCA».

Avísame cuando estén `fotoEntrada` y la web, para comparar las dos pantallas lado a lado.
