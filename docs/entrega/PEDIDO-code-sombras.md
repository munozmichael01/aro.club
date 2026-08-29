# A Code · Rectifico: la sombra de color está en la C, no en la B

Este documento sustituye por completo lo que decía antes. **Lo de las sombras
de las polaroids era un diagnóstico mío equivocado.** Michael se refería a la
C, y lo confirmé mirando los fotogramas al 100%, que es lo que tenía que haber
hecho antes de escribir el primer pedido. No apliques nada de la versión
anterior.

---

## Pieza B · cerrada

Michael la da por cerrada. **No la toques**, salvo por un detalle opcional que
está al final de este documento y que puedes dejar como está si no sale limpio.

---

## Pieza C · tres cosas del cierre

Estas tres se pueden arreglar ya, porque no dependen del guion nuevo. **El
resto de la C sigue parado** hasta que llegue el guion de Design con la
estructura v3 (`PEDIDO-design-guion-C-v3.md`).

### 1 · `#cortina`: eso es la sombra de color

Esto es lo que Michael llamó «el cambio de posición de las sombras de colores».
No es una `text-shadow` —la C no tiene ninguna—, es esto:

```css
#cortina{position:absolute;left:0;right:0;top:0;height:52%;z-index:3;opacity:0;
  background:linear-gradient(180deg,rgba(20,52,42,.86) 0%,rgba(20,52,42,.74) 60%,rgba(20,52,42,0) 100%);
```

Un rectángulo verde del 0 al 52% que entra en 11,6 s, **con borde visible** por
los tres lados y una terminación abajo que se lee como un canto recto cruzando
la tabla de madera. Míralo en `reel/fotogramas/_revision-C/C_todavia_100.jpg`:
el límite derecho del rectángulo se ve como una línea vertical sobre los
platos. Y en `C_14.6s.jpg` la mitad de arriba es verde y la de abajo es madera
caliente, con la costura a la vista.

Lo que lo convierte en «cambia de posición» es esto: la cortina está fija en el
0–52%, pero los tres elementos que lleva debajo están a alturas distintas
—`#todavia` en 400, `#aro` en 638, `#firma` en 918— y van entrando uno detrás
de otro. Así que la mancha verde está detrás de «Todavía», a media altura del
aro, y **por debajo de la firma**: la firma cae en 918–961 y el borde inferior
de la cortina está en 998, o sea que la línea de texto pasa justo por el punto
donde el verde se apaga. Cada elemento aparece sobre un fondo distinto, y eso
es exactamente lo que se ve como una sombra de color que se mueve.

**La regla es la misma que te di mal la primera vez, y ahora sí aplica donde
toca: un fondo no puede tener bordes que se vean, y no puede cambiar según qué
texto haya en pantalla.**

Tres salidas, por orden de preferencia mía. Elige tú y dime cuál y por qué:

**a.** La cortina deja de ser una banda y pasa a ser el propio velo. Es decir,
en el estado 2 el velo no baja a un valor plano: baja a un degradado de altura
completa, más denso arriba y más abierto abajo, sin ningún punto donde termine.
Un solo elemento, sin cantos, y la legibilidad del texto sale de la misma
gradación que ya usas en el estado 1.

**b.** Se queda la cortina pero con altura completa (`height:100%`) y una
parada intermedia que la lleve a cero muy despacio, de modo que no exista una
línea donde acabe. Lo de ahora corta en 52% con `rgba(...,0)` de golpe.

**c.** Fuera la cortina, y la legibilidad del cierre la da una `text-shadow`
suave en los tres elementos —una sola luz, mismo offset y mismo desenfoque en
los tres—, como ya hace la A en sus etiquetas.

Lo que no vale es dejar un rectángulo con canto.

### 2 · El aro está encima de la comida

`#aro` está en `top:638px` y ahí, en esa foto, hay una tabla de madera con
bruschettas. El anillo crema se dibuja sobre el pan claro, la comida se ve por
dentro del anillo, y los dos puntos de arriba a la izquierda se pierden contra
la miga. El aro deja de leerse como marca y se lee como una mancha.

Se ve en `C_14.6s.jpg`. La solución no es agrandar el aro ni ponerle sombra:
es **buscarle sitio**. En esa foto la zona limpia es la banda de madera oscura
entre el borde de la tabla y el plato vacío, más o menos entre y 1150 y y 1350,
y también el margen izquierdo. Prueba a bajar el bloque de cierre entero y
mándame el fotograma.

Ojo con una cosa al bajarlo: el guion dice que el cierre va arriba para no
tapar el plato vacío que el velo acaba de descubrir, y esa razón es buena. Si
al bajarlo el plato queda tapado, el bloque no cabe en esa composición y hay
que decirlo, no forzarlo. Dímelo y lo replanteamos con Design.

### 3 · La firma en caja mixta, y con el dominio en color

Ahora mismo, en el marcado:

```html
<div id="firma">ARO CLUB · ARO.CLUB · CARACAS</div>
```

Con `letter-spacing:.14em` y en versales, «ARO CLUB» y «ARO.CLUB» son la misma
palabra dos veces y parece un error de copiar y pegar. Michael: «nunca cerramos
con mayúscula».

En A y en B está resuelto y las tres piezas tienen que cerrar igual:

```html
<div id="firma">Aro Club · <span>aro.club</span> · Caracas</div>
```

A: Inter Tight 500, 40px, `letter-spacing:-.01em`, crema, `span` en `#C0662F`.
B: Inter Tight 500, 34px, `letter-spacing:-.005em`, verde, `span` en `#8F4515`.

Para la C, sobre fondo oscuro, la de A es la referencia: crema con el dominio
en `#C0662F`. El `letter-spacing` positivo se va: es lo que hace que las dos
palabras se lean como un bloque de versalitas y no como un nombre y una
dirección.

---

## Cómo se comprueba

Un fotograma del 12,5, otro del 13,8 y otro del 14,6, **al 100% y sin
reescalar**. En los tres:

1. No hay ningún borde recto de color en el cuadro.
2. La mancha oscura detrás del texto es la misma en los tres fotogramas.
3. El aro se lee entero, con sus seis puntos, contra un fondo que no compite.
4. La firma dice «Aro Club · aro.club · Caracas» y el dominio se lee como
   dominio.
5. El plato vacío sigue siendo lo que el velo revela.

Mándamelos.

---

## Opcional · la salida de las polaroids en la B

Michael: «el único detalle es que las polaroid desaparecen de forma brusca,
solo eso. Si lo puedes arreglar ok, si no, déjalas así».

Es esto, en los diez `@keyframes polN`:

```
54.533%{... opacity:1; animation-timing-function:linear}
56.067%{... scale(.983); opacity:.55}
57.6%{...  scale(.966); opacity:0}
```

0,46 s en `linear`. Una rampa recta llega al cero de golpe: la opacidad va
bajando a ritmo constante y en el último fotograma simplemente ya no está. Por
eso se ve un corte y no una salida.

Si lo tocas: alarga a unos 0,8 s y cambia el `linear` por una curva que frene
al final (un `ease-out`), de modo que el último tramo de opacidad se consuma
despacio. La escala puede acompañar un pelo más. **Sin mover el tiempo de
entrada de ninguna tarjeta ni la hora del cierre**: la B está cerrada por
tiempos y eso no se toca.

Si al alargar la salida se solapan dos tarjetas más de lo que ya se solapan, o
se corre el cierre, déjalo como está y dímelo. Es un detalle, no vale romper
una pieza cerrada por él.
