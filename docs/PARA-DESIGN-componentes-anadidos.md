# Componentes que puse yo y que Design no entregó

Todo esto lo monté al cablear las pantallas contra datos reales, porque
faltaba para que el flujo funcionara. **Ninguno es una decisión de diseño
tomada por mí a la ligera**: cada uno tapa un agujero concreto que aparece
cuando la pantalla deja de tener datos de ejemplo.

Necesito tu visto bueno, tu versión, o que me digas que sobra. Van con el
sistema visual actual (colores, radios, tipografías del `Sistema v3`), pero
no pasaron por ti.

---

## Miembro

### 1 · Estado `datos` en Mi cuenta
**Qué es:** un séptimo estado del bloque principal, entre "termina tu perfil"
y "verifica tu identidad". Sello `FALTAN TUS DATOS BASE`, título *"Faltan
cuatro datos para poder sentarte."*, y acción a `Datos base`.

**Por qué:** la pantalla de Datos base existía desde la entrega 3 pero **no
la enlazaba nadie**. Sin este estado nadie llegaba nunca, y sin nombre ni
fecha de nacimiento las dos restricciones más duras del reparto —horquilla
de diez años y equilibrio de género— quedaban desactivadas.

**El copy lo saqué de tu propia pantalla de Datos base**, no lo inventé.

### 2 · Botón "Operación" en la cabecera de Mi cuenta
**Qué es:** una pastilla con borde, a la derecha del logo, solo visible para
quien tiene rol de operación.

**Por qué:** un admin entraba y veía la vista de miembro sin ninguna puerta
al panel.

### 3 · Esqueleto de carga en Mi cuenta
**Qué es:** la silueta del bloque que viene —sello, dos líneas de título,
tres de texto y el botón— en el verde de la marca al 9%, latiendo.

**Por qué:** el estado lo decide el servidor, así que hay una espera real.
Antes se pintaba el primer estado por defecto y saltaba: gente con las
diecisiete respuestas hechas veía medio segundo de *"TE FALTAN 13
PREGUNTAS"*. Un gris neutro sobre el crema se ve sucio, por eso va en verde.

### 4 · Cabecera con sesión en la Landing
**Qué es:** cuando hay sesión, "Entrar" y "Empezar" se sustituyen por un solo
botón "Mi cuenta" — o "Mi mesa" si su mesa ya está abierta. Sin sesión, la
landing queda exactamente igual que la entregaste.

**Por qué:** un miembro que tocaba el logo desde cualquier pantalla aterrizaba
en la página pública con "Entrar" y "Empezar" y sin vía de vuelta. Desde
dentro eso no se lee como una página pública, se lee como que te han echado.

### 5 · Aviso de error en Datos base
**Qué es:** un bloque con `role="alert"`, círculo `!` y el motivo, encima del
botón.

**Por qué:** el guardado puede fallar (teléfono mal, menor de edad) y no
había dónde decirlo.

### 6 · Quité dos cosas de Verificación
- **"Ver en escritorio / Ver en móvil"**: conmutaba el layout a mano. Era
  cromo de maqueta, del mismo tipo que los `DEMO ·` que ya quitamos en la
  entrega 2. El dispositivo se detecta solo con `pointer: coarse`.
- **"Ver qué pasa si algo falla"**: saltaba a la pantalla de rechazo sin que
  hubiera ningún rechazo, así que en producción enseñaba un motivo vacío.

Si alguna de las dos te hace falta para enseñar el diseño, dímelo y busco
otra forma.

---

## Operación

### 7 · Bloque "QUÉ HAY QUE REVISAR" en la tarjeta de mesa
**Qué es:** debajo de las señales, una lista con la regla rota en claro y a
quién afecta. Ejemplo: *"Dos de la misma empresa — Gabriela y José, los dos
en banesco"*.

**Por qué:** el sello `REVISAR` no decía qué revisar. Las roturas iban como
chips mezclados con "3 y 3" y "29–33 años", que no son problemas.

### 8 · Bloque "QUÉ COMPARTEN" en la tarjeta de mesa
**Qué es:** pares clave/valor con lo que tienen en común los seis: zonas que
les sirven, presupuesto, idiomas, temas, cuántos llevan la conversación, y
las dietas que el restaurante tiene que cubrir.

**Por qué:** con la puntuación y las roturas se sabe qué está mal, pero no
por qué la mesa está bien. Sin eso, publicar es firmar a ciegas.

### 9 · Bloque "DÓNDE LOS SENTAMOS" (selector de sitio)
**Qué es:** pastillas con los restaurantes abiertos en las zonas que acepta
esa mesa. La elegida va marcada.

**Por qué:** el evento pasó a ser una fecha, y el sitio se decide por mesa.
Una mesa que comparte tres zonas puede ir a tres sitios distintos y esa
elección es de operación, no del algoritmo.

### 10 · Freno al publicar
**Qué es:** un bloque de aviso con lo que está roto mesa por mesa, y tres
botones: "Publicar igualmente" (en el marrón de aviso, no en el primario),
"Volver a repartir" y "Cancelar".

**Por qué:** publicar no miraba las roturas. Creaba las mesas y encolaba los
correos igual. "Publicar igualmente" existe porque a veces conviene —catorce
apuntados y la única mesa posible tiene once años de diferencia— pero queda
registrado quién lo aceptó.

### 11 · Aviso de acción
**Qué es:** una línea con `role="status"` que dice qué acabó de pasar
("Publicadas dos mesas. 12 correos en cola").

**Por qué:** repartir y publicar respondían bien y la pantalla no decía nada.
Como el reparto es determinista, la propuesta nueva sale casi igual y desde
fuera parecía un botón muerto.

### 12 · Arrastrar personas entre mesas
**Qué es:** las filas de comensal se arrastran; la tarjeta de destino cambia
de fondo y borde al pasar por encima, y la fila que sale se atenúa.

**Por qué:** el algoritmo no sabe todo. Al soltar, el servidor recalcula las
dos mesas: mover sin revalidar convertiría el freno en decorado.

### 13 · Flecha `→` al perfil del miembro
**Qué es:** un botón circular al final de cada fila de comensal.

**Por qué:** mirando una mesa quieres poder ver quién es alguien. **Ahora
mismo no lleva a ningún sitio** porque esa pantalla es justo la que te
estamos pidiendo (`PARA-DESIGN-perfil-miembro.md`).

### 14 · Publicar y deshacer por mesa
**Qué es:** un botón dentro de cada tarjeta. Verde sólido para publicar; en
borde marrón para deshacer una ya cerrada.

**Por qué:** publicar era todo o nada, y volver a repartir rehacía mesas que
ya estaban bien. Deshacer va en borde porque no es el camino normal.

### 15 · Sello CALCULANDO y cuerpo atenuado
**Qué es:** al mover a alguien, las dos mesas afectadas cambian el sello a
`CALCULANDO` y atenúan su contenido hasta que el servidor responde.

**Por qué:** la puntuación y las señales visibles son las de antes del
movimiento. Atenuarlas dice que no son de fiar todavía.

### 16 · Nota bajo el selector de sitio
**Qué es:** una línea que explica por qué no hay alternativa cuando solo
hay un sitio posible.

**Por qué:** un selector con una sola opción parece un adorno roto. El
problema no es la pantalla: es que no hemos abierto más sitios en esa zona.

---

## Lo que quiero de ti

1. Si alguno te parece mal resuelto, tu versión manda y la monto.
2. Si alguno sobra, lo quito.
3. Los que apruebes, incorpóralos al sistema para que la próxima entrega ya
   los traiga y no vivan solo en mi código.
