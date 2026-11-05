# Entrega · Cómo se ve la carga · App y web · 03-11-2026

Referencia visual: `Carga - Lenguaje.dc.html` (ábrelo junto a `support.js`; las fotos de `ref/` son las de los filtros de la agenda).

## La regla

- **Menos de 0,4 s → nada.** No se pinta ningún indicador.
- **Sabemos la forma → esqueleto.** Inicio, Mi mesa (cerrada y abierta), Pasadas, Pago, Estás dentro, Cancelar, Cambiar de fecha, invitación del +1 y Legal.
- **Es un paso → el aro en el botón que tocaste.** Pagar, apartar, guardar, enviar, entrar. La pantalla no se tapa.
- **No sabemos qué pintar → velo con el aro y «Un momento».** Solo al arrancar y al entrar en Datos, Cuestionario y Verificación.
- Inicio y Mi mesa ya enseñan lo último visto al instante: ahí no sale nada de esto, se actualiza por detrás.

## Qué cambia

**Tiempos.** `tiempo.umbral` 400 ms (antes no se enseña nada). `tiempo.minimoVisible` 500 ms (sustituye a `veloMinimo` y vale para todo). `tiempo.tarda` 8000 ms (sale «Está tardando más de lo normal.» con «Reintentar»). `tiempo.veloTope` 6000 ms se queda. `tiempo.transicion` 180 ms y `tiempo.escalon` 40 ms, hasta tres tandas. `tiempo.latido` 1600 ms. `tiempo.vueltaAro` 1500 ms se queda.

**`<Hueso>`.** Componente nuevo en `diseno/`. Recibe la variante tipográfica de la línea que reemplaza (cuerpo, titulo, display…) y un ancho. Pinta la caja de la línea con su interlineado real y el hueso centrado dentro, al 70-80 % del tamaño de la letra. Color: `tinta(0.08)` sobre crema y crema elevada; `cremaAlfa(0.12)` sobre verde. Todos los huesos de una pantalla comparten un solo latido de 1 a 0,5 de opacidad. Sin brillo que barre, sin sombras.

**Esqueletos.** Uno por pantalla, en el mismo archivo que la pantalla y con sus mismos contenedores, para que no se desajusten: `EsqueletoInicio` (sustituye a `Esqueleto` de `cuenta/Partes.tsx`), `EsqueletoMesaCerrada`, `EsqueletoMesaAbierta`, `EsqueletoPasadas`, `EsqueletoPago`, `EsqueletoDentro`. También Cancelar, Cambiar de fecha, la invitación del +1 y Legal, con la misma regla. Lo fijo se pinta con su texto; los botones de texto fijo van apagados. En Pasadas, cuatro filas con la medida de una cena pasada en lugar del aro de 36.

**Mi mesa sin fase.** La primera vez, sin nada guardado, la fase se toma de la tarjeta de estado de Inicio si ya llegó. Si no, va el esqueleto de la cerrada.

**De esqueleto a contenido.** Cada bloque cambia en 180 ms, de arriba abajo, 40 ms entre uno y otro, máximo tres tandas (1: saludo y tarjeta de estado; 2: filtros de la agenda; 3: las filas). Solo opacidad: nada se desliza ni crece. Si llega a trozos, cada bloque entra cuando tiene lo suyo. Lo que viene de lo último guardado entra sin fundido.

**`<AroCarga>`.** Pasa de girar a llenarse: el anillo quieto (trazo 1,5 al 20 % de la tinta) y cada punto se enciende de 0,16 a 1 en su turno (6 %, 18 %, 30 %, 42 %, 54 % y 66 % de la vuelta), empezando por el terracota; se mantienen hasta el 84 % y se apagan juntos hacia el 96 %. Nunca se queda lleno. Tamaños permitidos: 20, 28, 40 y 54. El de 36 pasa a 40, y los de 18 y 22 pasan a 20. Sobre verde: puntos en crema y el tuyo en `#E39C63`. Con «reducir movimiento», los seis encendidos y quietos.

**`<Boton trabajando>`.** Prop nueva. Mantiene color y texto, mete `AroCarga` de 20 a la izquierda (relleno 18 + aro + 10, mismo ancho total), bloquea el toque, `aria-busy` y `accessibilityLabel` con la acción en curso («Apartando tu puesto»). Desaparecen los textos que cambian («Apuntándote», «Guardando…», «Enviando…») y el aro suelto en lugar del botón. Al terminar bien, check 0,6 s si no hay cambio de pantalla. Si falla, vuelve al reposo y el aviso sale encima del botón; lo escrito se conserva.

**`<SinRespuesta>`.** Componente único. Sin datos guardados: bloque en crema elevada, icono de sin conexión, título «No pudimos cargar {qué}.», texto «Revisa tu conexión e inténtalo otra vez. En cuanto vuelva, lo intentamos solos.» y Boton secundario «Reintentar». Si es error del servidor, la segunda línea es «Es cosa nuestra, no tuya: vuelve a intentarlo en un momento.». Con datos guardados: franja en crema fría bajo la cabecera, «Sin conexión. Esto es de las {hora}.» (hora real de los últimos datos; si es de otro día, «Esto es del lunes 2») y el enlace «Reintentar». Al volver la red, se reintenta solo. Sustituye a cada Aviso + Reintentar de hoy. Pasadas deja «Volver a intentar».

**`<Velo>`.** Se queda solo al arrancar y en Datos, Cuestionario y Verificación, con `AroCarga` de 54 y «Un momento». Aplica el umbral de 0,4 s antes de enseñarse.

**Reducir movimiento.** Nada late ni gira. Huesos quietos al 8 % de la tinta. Aro con los seis puntos encendidos. Se queda el fundido de 180 ms, sin tandas: todo a la vez.

**Web.** Las mismas piezas y los mismos tiempos en las páginas `.dc.html` y en la web pública: esqueleto, aro, botón y estado sin respuesta. En CSS, `prefers-reduced-motion` hace lo mismo que en la app.

**Correos y notificaciones.** No llevan carga. Lo único que les toca: nada de «Casi listo» ni promesas de tiempo que no sabemos.

## Pendiente de aprobación

Los textos nuevos («Está tardando más de lo normal.», «Sin conexión. Esto es de las…», «En cuanto vuelva, lo intentamos solos.», «Apartando tu puesto») los aprueba Michael. Los esqueletos de Pago y Estás dentro siguen su estructura de hoy; Code ajusta cada hueso a la medida exacta de su línea.
