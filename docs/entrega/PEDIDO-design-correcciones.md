# A Design · Correcciones a los dos guiones

Los dos guiones están bien estructurados y el formato es el correcto: tabla
por evento, tiempos explícitos, y resolviste sin que te lo pidiera dos cosas
que agradezco. La capa de sombra del segundo 12,0 para tapar el rótulo del
edificio es exactamente la salida que hacía falta, y dejar W4 y W13 mudas es
buena idea por la razón que das.

Ahora lo que hay que corregir. Lo primero es serio.

---

## A · Las coordenadas de las etiquetas no cuadran con la imagen

Pinté tus doce etiquetas sobre `fachada-ventanas.jpg` en las posiciones
exactas de tu tabla, con Young Serif a 30px y la alineación que indicas. El
resultado está en `docs/entrega/reels/_verificacion-posiciones.jpg`. Míralo
antes de seguir leyendo.

De las doce, **cinco caen bien** —«Cancelando planes», «Cenando sola»,
«Pidiendo delivery», «Repasando el grupo sin escribir» y «Viendo stories»—.
Las otras siete tienen tres problemas distintos:

**Dos se pisan.** «Diciendo "otro día"» (W9, derecha, termina en 78%) y
«Buscando quién esté libre» (W8, izquierda, empieza en 66%) están las dos a
y=62% y se solapan. Es el mismo tipo de fallo que acabo de devolverle a Code
en el titular, y por la misma razón: dos cajas de texto compartiendo sitio.

**Dos se salen del cuadro.** «Buscando quién esté libre» se corta por la
derecha, y «Poniéndose al día con la mamá» se sale por abajo a la derecha.
Ninguna de las dos cabe con el ancho que tiene a 30px.

**Cuatro flotan sobre hormigón oscuro, lejos de cualquier ventana
encendida.** «Viendo fotos viejas» a (78,27) queda sobre un panel de calados
mientras la ventana con la figura de pie está a y≈18%. «Overthinking» a
(78,39) queda en medio de un panel vacío. «Escribiéndole a la ex» a (36,54)
alineada a la derecha acaba en la mitad izquierda, sobre vegetación, cuando
la ventana con la figura caminando está a x≈53%. «Comiendo de pie» a (54,83)
acaba sobre plantas, y la ventana encendida de esa altura está a x≈73%.

Una etiqueta que no está junto a una ventana encendida no dice nada: la
pieza entera se sostiene en que cada texto pertenece a una persona concreta.

**Lo que necesito:** vuelve a medir sobre la imagen, no de memoria. Y **el
guion revisado viene con su propia imagen de comprobación**: las doce
etiquetas pintadas en sus posiciones finales, para poder mirarla antes de que
Code monte nada. Igual que el comprobador de fotogramas, la idea es que la
verificación sea parte del entregable y no dependa de que alguien se acuerde
de mirar.

Al re-medir, tres reglas que salen de lo que se ve en la imagen: ninguna
etiqueta puede cruzar el 6% de margen por ningún lado; dos etiquetas a menos
de 8% de distancia vertical tienen que estar en mitades opuestas del cuadro;
y las etiquetas largas —«Repasando el grupo sin escribir», «Poniéndose al día
con la mamá»— o van en una columna con sitio o se acortan.

## A · Las doce etiquetas entran demasiado pronto

Todas caen entre el 0,60 y el 4,95, y después hay **seis segundos** (4,95 a
11,00) en los que lo único que pasa es el zoom. Argumentas que la regla 6 lo
cubre, y el fondo sí se mueve, pero eso es exactamente «el texto llega y se
queda», que es el defecto que estamos arreglando.

Y no es lo que hace la referencia. En `docs/referencias-reels/04-veinte-ventanas/`
las etiquetas siguen apareciendo hasta el segundo 12: en el fotograma de 0 s
hay seis, en el de 12 s hay diecisiete. El goteo dura toda la pieza.

Reparte las doce entre el 0,60 y el 10,50, acelerando al final. Con eso el
hueco desaparece solo y se parece más a lo que funciona.

---

## B · El compás constante

Tu propia nota lo dice: 0,40 s fijos, once veces seguidas. La regla 4 es que
el compás varía, y el salto de tamaño en «creándolo» es **un evento al
final**, no un cambio de compás. Cuatro segundos y medio de metrónomo se
sienten como una máquina de escribir.

El arreglo está en las referencias, y es entrar **por grupos, no por palabra
suelta**. La 01 hace «No one wants» → «to be» → «a villager». La 02 hace
«Are you making» → «friends» → «for what you» → «can get right now?».
Ninguna de las dos va palabra a palabra.

Para nuestra frase eso sería algo como «La mejor manera» → «de pertenecer» →
«a un grupo de amigos» → «es creándolo», con los intervalos distintos entre
sí: el grupo largo pide más aire, y el último se hace esperar. Propón tú el
reparto exacto, pero que no haya dos intervalos iguales seguidos.

De paso, la frase termina de construirse en 4,70 y las polaroids empiezan en
5,20. Cuando cambies el compás revisa que ese relevo siga cayendo bien.

---

## Lo que no hay que tocar

Las ocho polaroids con sus escenas y sus giros están bien y ya las estoy
generando con esa lista y en ese orden. El cierre de las dos piezas también
queda como está.

Cuando devuelvas los dos guiones revisados, con la imagen de comprobación de
A, Code arranca con las dos piezas.
