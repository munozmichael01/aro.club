# Para Design · El Journey se quedó viejo, y falta la pantalla de locales

Dos cosas. La primera es una corrección al `Journey.dc.html` que hiciste: el
producto cambió por debajo y hay cuatro pasos que ya no describen lo que
pasa. La segunda es una pantalla nueva que necesitamos.

---

# 1 · Lo que cambió y el Journey no recoge

## a) Las zonas: el cambio más grande, y no aparece

Un evento **ya no es un restaurante**. Es una fecha.

Antes, "Cena · jueves 13" llevaba dentro un sitio y todos cenaban allí. Ahora
al crear la fecha **nosotros decidimos qué zonas abrimos** y en qué
restaurante se cena en cada una. Dos mesas del mismo jueves pueden estar en
Las Mercedes y en El Rosal.

Del lado del miembro, en el paso 06, hay que ser precisos con quién elige
qué, porque es fácil contarlo mal:

- **Nosotros ofrecemos.** Solo ve las zonas que abrimos esa fecha. Las demás
  ni se enseñan apagadas: una opción que no se puede elegir es ruido.
- **Él marca en cuáles le sirve**, en plural. Vienen premarcadas con las que
  ya contestó en el cuestionario.
- **Nosotros decidimos dónde se sienta.** Él nunca elige restaurante, y
  hasta la revelación no sabe cuál es.

O sea: no elige zona, **acepta zonas**. Y esa diferencia es todo el producto,
porque es lo que permite armar mesas con poca gente.

Lo que pierde: si aceptó dos zonas, hasta el jueves a las doce sabe "Las
Mercedes o El Rosal" en vez de una respuesta cerrada. Es el precio de poder
sentarlo, y está decidido.

## b) Paso 08: no son "tres señales", son siete reglas duras

El Journey dice *"calcula las tres señales por mesa"* y lista balance 3/3,
spread de 10 años y sin empresa repetida.

Son siete, y ninguna es una señal: si una se rompe, la mesa no debería
existir. Balance de género, horquilla de edad, empresa repetida, ya cenaron
juntos, tramos de presupuesto incompatibles, sin idioma común, y sin zona
que les sirva a los seis.

## c) Paso 08: publicar ya no es un botón, son varios

*"Una persona revisa y publica"* se quedó corto. Ahora:

- Se publica **mesa por mesa**. Cerrar una fija ese grupo y saca a esa gente
  del reparto: volver a repartir mueve al resto y no la toca.
- Si una mesa rompe una regla, publicar **se para** y dice qué está roto.
  Hay un camino para publicarla igualmente, y queda escrito quién lo aceptó.
- Una mesa cerrada **se puede deshacer**.

## d) La rama de cancelar

Dice *"rehace el reparto si aún no se publicó"*. Con publicación por tandas
hay que precisar: rehace el de **las mesas que siguen abiertas**. Si su mesa
ya se cerró, hay que deshacerla primero o la mesa se queda en cinco.

## e) Un detalle del paso 09 que sí está bien y conviene dejar escrito

*"Los correos estaban programados desde que se publicó. Salen a las doce en
punto"*. Correcto, y ahora la base lo impide de verdad: marcar un correo
como enviado antes de su hora falla.

Consecuencia práctica que el Journey podría decir: **cerrar una mesa el
viernes para una cena del jueves siguiente da seis días para deshacerla sin
que nadie se entere.** El punto de no retorno no es publicar, es la
revelación.

---

# 2 · Pantalla nueva: locales

Hoy los restaurantes solo se pueden crear escribiendo en la base. No hay
lista, ni alta, ni forma de ver cómo se ha portado ninguno.

Y falta justo donde más duele: al armar una mesa, elegir dónde se sienta
depende de qué sitios tengamos abiertos en sus zonas. Si solo hay uno, no
hay decisión que tomar.

## El problema, no la solución

Necesitamos poder **decidir con qué locales trabajamos y cuáles renovamos**.
Eso son decisiones de dinero y de calidad de la cena, y hoy se toman de
memoria.

Lo que sabemos que hace falta saber de un local:

- **Dónde está**: zona y dirección. La zona es lo que decide a qué mesas
  puede ir, así que es lo más importante de la ficha.
- **De qué tipo es**: puede ser restaurante, bar, café o sitio de
  movimiento, y puede ser más de uno a la vez — un sitio puede servir para
  la cena del jueves y para los drinks del viernes. Los formatos son los
  cuatro que ya están en la landing.
- **Cuántas mesas de seis aguanta a la vez.** Es un tope real: si aguanta
  dos y ya hay dos, la tercera mesa tiene que ir a otro sitio.
- **Cuánto cuesta**: menú cerrado por persona, gasto medio, comisión.
- **Si se puede conversar.** Tenemos un nivel de ruido de 1 a 3, y una mesa
  que viene a conversar en un sitio ruidoso es una mesa arruinada.
- **A quién llamamos**: contacto y teléfono.
- **Cómo se ha portado**: cuántas mesas mandamos, cuántas personas, qué
  valoración media dieron los que cenaron ahí, y desde cuándo trabajamos con
  ellos.

Sobre la foto: la que puede hacer falta es **la de la entrada**, para que
alguien que llega de noche a una calle que no conoce sepa que es ahí. No es
una foto de plato ni de decoración. Dinos si la ves necesaria.

## Dos cosas que no son negociables

- **Un local no se borra, se desactiva.** Borrarlo se llevaría por delante
  el historial de las mesas que ya cenaron allí. Deja de ofrecerse para
  fechas nuevas y su histórico sigue.
- Si crees que hace falta **ficha propia por local** además de la lista,
  dilo tú. Nosotros vemos el histórico como lo más valioso, pero cómo se
  reparte entre lista y ficha es tu decisión.

## Reglas de siempre

- Códigos estables de `HANDOFF.md` §2.1 para zonas y formatos.
- Nada de cifras derivables escritas a mano.
- Sin cromo de maqueta: ni `DEMO ·`, ni conmutadores de dispositivo, ni
  botones que salten a un estado que no existe.
- Ningún control por debajo de 44px, `em { font-style: normal }`, contraste
  AAA, y nada dice "algo salió mal".
