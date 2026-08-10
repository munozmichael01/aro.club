# Para Design · La valoración del local, y lo que un local necesita saber

Hay **dos valoraciones** en Aro y solo diseñamos una.

La de la **mesa** existe: «¿Volverías a esa mesa?», en F11. La del **local**
no se definió nunca. Y yo la di por hecha: la pantalla de locales enseñaba
«Valoración media · De quienes cenaron» y decidía «renovaríamos» con la nota
de la mesa. Es decir, un restaurante impecable perdía puntos porque a alguien
le tocó una mesa aburrida. Ya lo quité; ahora la ficha dice que la nota que
enseña es la de las mesas y que la del sitio hace falta preguntarla.

---

## 1 · Lo que hay que diseñar

### 1.1 · Un segundo bloque en F11

Después de valorar la mesa, valorar el sitio. **Tres preguntas, y las tres
las contesta quien estuvo ahí** —que es lo único que sabe la respuesta—:

| Pregunta | Por qué | Obligatoria |
|---|---|---|
| **¿Qué tal el sitio?** | Es la nota del local. La que decide si se renueva | sí |
| **¿Cuánto gastaste?** | Es el gasto medio real, por persona | **no** |
| **¿Se podía conversar?** | Es el ruido, medido y no supuesto | sí |

**El gasto va con su porqué en pantalla.** Es opcional, y hay que decir para
qué sirve: «opcional, pero nos ayuda a no sentarte donde no querías gastar».
Sin esa frase es una pregunta sobre el dinero de alguien sin contrapartida.

**Las tres son sobre el sitio, no sobre la gente.** Van separadas del bloque
de la mesa y con su propio encabezado: mezclarlas haría que quien tuvo mala
compañía castigue al restaurante, que es justo el error que estoy corrigiendo.

### 1.2 · El ruido pasa a tener dos valores, y eso es información

Hoy el ruido lo declara operación al dar de alta el local. A partir de aquí
hay dos:

- **el declarado**, lo que creemos al abrirlo
- **el medido**, lo que dicen las que cenaron

Y cuando no coinciden, eso es lo interesante: un sitio que abrimos como «se
puede conversar» y que la gente reporta como «suena alto» es un sitio que hay
que revisar antes de mandar otra mesa. La ficha debería enseñar los dos y
señalar el desacuerdo.

Lo mismo con el gasto: **declarado** frente a **real**.

### 1.3 · Ojo con el orden

F11 ya tiene tres caminos independientes (valorar, bloquear, reportar) y esa
independencia costó. Esto es un cuarto bloque, no un paso dentro de valorar:
quien no quiera puntuar el sitio tiene que poder enviar la mesa igual.

---

## 2 · Lo que le falta a la ficha del local

De trece campos que el modelo tiene, **el alta pide cinco y la ficha completa
seis**. El resto no se puede rellenar desde ninguna pantalla:

| Campo | Estado hoy |
|---|---|
| Enlace a mapas | vacío en todos · sin sitio donde ponerlo |
| Foto de la entrada | vacío en todos · **no hay subida** |
| Comisión por cabeza | vacío en todos · sin sitio donde ponerlo |
| Gasto medio | vacío · **sin sitio donde ponerlo** (y pasa a ser derivado) |
| Rango de precio | con valor, **nadie lo lee** y no se informa |
| Notas de seguridad | vacío en todos · sin sitio donde ponerlo |
| Parking | **el campo ya existe**, no es editable |
| Sirve de segundo acto | existe, no es editable |

---

## 3 · Campos nuevos

Los dos que pidió Michael:

- **Parking** — ya existe en la base, solo falta enseñarlo y editarlo.
- **Metro cerca** — cuál y a cuántos minutos. En Caracas decide si alguien
  acepta una zona.

Y cinco que propongo yo, porque son los que deciden si una mesa de seis
desconocidos funciona:

- **Qué días abre.** Un sitio cerrado los jueves no puede recibir la cena del
  jueves, y hoy nada lo impide.
- **La forma de la mesa: redonda o larga.** En una mesa larga de seis, los dos
  extremos no se oyen. Para un producto que vende conversación, esto pesa más
  que el ruido.
- **Si dividen la cuenta.** El problema práctico número uno de seis
  desconocidos. Un sitio que no divide arruina el final de la noche.
- **Última hora de entrada**, para quien llega tarde.
- **Accesibilidad** y **terraza o interior**.

---

## 4 · Lo que decide el reparto, y lo que aún no

El contrato de la entrega 8 §4.5 dice que el gasto del local cruza con el
tramo declarado de cada persona, eligiendo por **el más bajo de la mesa**.
**Eso no está implementado**, y no puede estarlo todavía: no teníamos gasto
real. Con la pregunta del 1.1 lo tendremos, y entonces lo monto.

Hasta entonces, una mesa donde tres personas marcaron «hasta 20 USD» puede
acabar en un sitio de 50 y nadie lo frena.

Lo que el reparto **sí** respeta ya: local activo, formato, ruido 3 fuera de
las cenas, aforo, y que el sitio tenga dirección y teléfono.

---

## 5 · Y lo que ya nos debías

Para que vaya todo en la misma tanda:

1. **La app de miembro**, que es la grande.
2. **Mi cuenta y Mi perfil rehechos** — la lista de planes crece sin techo y
   hunde el acceso a su información; la fila de la cena pasada no lleva a
   valorar, así que hoy F11 solo se alcanza escribiendo la URL a mano.
3. **El legal completo**, con la tensión de `baja_cuenta` resuelta: «borra
   respuestas y documentos» y «conserva facturación diez años» conviven, pero
   el legal tiene que decir exactamente qué se queda.
4. **El octavo correo**, `pago_no_cuadra`. El correo 06 lo promete.
5. **La web revisada al nivel de la app.**

---

## 6 · Una cosa que no es tuya y conviene que sepas

**No hay remitente de correo.** Hay siete encolados y cero enviados. Ninguna
de las promesas de «te escribimos» se cumple hoy, incluida la de la cola de
reportes. Es mío y va después de esto.
