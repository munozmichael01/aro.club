# Afinidades: qué habría que tocar, y qué decides tú

Michael, 29-10: «cuando dos personas se marcan mutuamente, se ve en el perfil
de cada una con quién tiene afinidad, y si vuelven a coincidir en una mesa, se
ve en esa mesa. NO cambies el veto de tres meses: plantéame por escrito qué
habría que tocar y lo decido yo».

Esto es ese escrito. **No hay nada implementado de aquí.**

---

## Lo que ya existe y no hay que tocar

La marca mutua se guarda desde el 29-10 (`e4fb1c6`): `peer_feedback` con
`signal = 'connect'`, una fila por (mesa, quién marca, a quién). Hay afinidad
cuando existen las dos filas cruzadas. Eso ya funciona y está probado.

Así que lo de abajo no es «construir las afinidades»: es **enseñarlas**.

---

## El problema de verdad, y es uno solo

**Con el veto de tres meses, dos personas con afinidad no se vuelven a ver en
una mesa.** Nunca. Esa es toda la cuestión.

El veto sale de `pair_encounters`, que escribe un trigger
(`record_pair_encounters`) cada vez que alguien se sienta. El pool mete en
`vetados` a todo par que se haya visto en los últimos tres meses, y
`roturas()` lo trata como regla dura: una mesa con dos vetados no se publica
sin forzar.

O sea que «si vuelven a coincidir en una mesa, se ve en esa mesa» es hoy una
rama **muerta**: la segunda mitad de tu frase no puede ocurrir. Pasados tres
meses sí, y entonces sería una coincidencia del azar, no algo que hagamos.

Hay tres salidas y las tres son tuyas, no mías.

### A. No tocar nada

Las afinidades se ven **solo en el perfil**, como recuerdo de con quién
conectaste. Volver a coincidir queda al azar después de tres meses.

- **A favor:** cero riesgo. El veto es lo que sostiene que cada mesa sea gente
  nueva, que es el producto.
- **En contra:** media frase tuya se queda sin hacer. Y es la mitad bonita.

### B. La afinidad levanta el veto solo entre esas dos

Si las dos se marcaron, el veto deja de aplicarse **a ese par**. El resto del
veto sigue igual.

- **A favor:** hace exactamente lo que pediste, y solo donde las dos dijeron
  que sí. Nadie se reencuentra con quien no quiso.
- **En contra:** una mesa de seis puede acabar con dos que ya se conocen, y
  para los otros cuatro eso cambia la noche. El club promete cinco
  desconocidos. Con una pareja dentro, son cuatro desconocidos y una pareja.
- **Lo que haría falta tocar:** `construirPool` quita del conjunto `vetados`
  los pares con `connect` mutuo. Una línea. Y `roturas()` no se entera, porque
  lee `vetados`.
- **El tope que yo pondría:** como mucho UNA pareja con afinidad por mesa. Sin
  eso, el día que haya muchas afinidades el reparto puede armar una mesa de
  tres parejas, que ya no es una mesa de Aro.

### C. Como B, pero solo si los otros cuatro son nuevos para las dos

Igual que B, más la condición de que ninguna de las dos conozca a nadie más de
esa mesa.

- **A favor:** protege la promesa. Para los otros cuatro sigue siendo todo
  gente nueva.
- **En contra:** más difícil de que cuadre, así que pasará poco.

---

## Lo que yo recomiendo

**La A ahora, y la B cuando haya datos.** Dos razones:

1. **Hoy no hay ninguna afinidad.** La marca existe desde hace unas horas.
   Decidir cómo tratarlas antes de tener una es decidir a ciegas.
2. **El veto de tres meses está a prueba.** Lo dice su propio comentario en
   `pool.ts`: se bajó de seis a tres «a proposito, para ver que pasa: con poca
   gente, seis meses de veto agota el pool». Con 132 personas sentadas, meterle
   una excepción ahora mueve dos cosas a la vez y no sabrás cuál hizo qué.

Enseñar la afinidad en el perfil es la mitad que no tiene coste y se puede
hacer ya. La otra mitad pide un número que todavía no existe.

---

## Si dices que sí, esto es lo que toco

**Para enseñarla en el perfil** (vale para A, B y C):

- `GET /api/mi-perfil`: campo nuevo `afinidades: [{ id, nombre, cuando }]`, los
  pares con `connect` mutuo. Solo nombre de pila, como todo lo que se enseña de
  otro miembro.
- `Aro Club - Mi perfil.dc.html`: un bloque con las caras. Falta decidir si se
  puede quitar una afinidad, y yo creo que sí: lo que se marcó una noche puede
  dejar de apetecer.

**Para que se vea en la mesa** (solo si eliges B o C):

- `construirPool`: sacar de `vetados` los pares con afinidad mutua.
- `repartir.ts`: una rotura nueva si hay más de una pareja con afinidad en la
  misma mesa, para que el tope no dependa de la suerte.
- `GET /api/mi-mesa`: marcar en `companeros` quién es afinidad tuya, para que
  la pantalla pueda decirlo en vez de dejar que se reconozcan solos.

**Lo que NO tocaría en ninguno de los tres casos:** el trigger de
`pair_encounters` ni la ventana de tres meses. Lo que cambia es a quién se le
aplica, no cuánto dura.

---

## Lo que necesito de ti

1. **¿A, B o C?**
2. Si es B o C: **¿una pareja por mesa como mucho?**
3. **¿Se puede quitar una afinidad** desde el perfil?
