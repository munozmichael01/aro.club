# Entrega 7 · Concepto, y respuesta a tus tres notas

Esta carpeta cierra tres tandas de una vez: la 5 y la 6 nunca llegaron a tus manos, así que las he plegado aquí en vez de mandarte tres carpetas con archivos que se pisan.

| Archivo | De dónde viene |
|---|---|
| `Landing v3` · `Cuestionario` | **nuevos** — cambios de concepto de esta tanda |
| `Perfil miembro` | **nuevo** — la pantalla que pediste; la flecha `→` de cada comensal ya tiene destino |
| `Mi cuenta` · `Verificacion` | revisadas en la tanda 5, sin cambios desde entonces |
| `Sistema v3` · `support.js` · `fotos/` | sin cambios |

No hay carpetas 5 ni 6: todo lo suyo que seguía vivo está aquí, y lo que sustituía esta tanda no tenía sentido mandártelo para que lo descartaras.

---

## 1 · Lo que cambia en esta tanda

### 1.1 · El reconocimiento pasa de cinco a seis, y sale del algoritmo

Encabezado nuevo: **«¿Te suena alguna de estas?»**. El anterior diagnosticaba.

| Código | Estado |
|---|---|
| `volvio` | igual |
| `se-quedo` | igual |
| `mismos` | **nuevo** — sigue con la gente de siempre |
| `remoto` | **nuevo** — trabaja remoto y casi no ve gente |
| `interior` | igual |
| `visita` | igual, ampliado a turista y viaje de trabajo |
| `extranjero` | **eliminado**, se fusiona en `interior` |

Las dos nuevas rompen el requisito de haber emigrado, que sesgaba el producto hacia los treinta y muchos.

**El arraigo deja de ser restricción de emparejamiento.** Quedan las tuyas, que son las correctas. El arraigo pasa a ser espejo en la landing y segmento en operación: `visita` no recibe ofertas de pack ni de recurrencia. Guárdalo, no lo apliques al reparto.

### 1.2 · Migración de `extranjero` — léela entera

`extranjero` viajó con `v: 2` durante varias rondas. En mi propio código la fusión estaba dentro del bloque `v !== 2`, así que esos perfiles caían en el otro branch, no resolvían, y **el arraigo se perdía en silencio**. Ya está corregido: la normalización va antes de bifurcar por versión.

En tu lado: `UPDATE ... SET arraigo='interior' WHERE arraigo='extranjero'`. No basta con quitar la opción del enum.

`mismos` y `remoto` son códigos nuevos y van **al final de la lista**, aunque en pantalla salgan en otro orden.

### 1.3 · Ciudad como variable

El copy sigue siendo específico —«Caracas»— pero deja de ser constante. Arquitectura **ciudad → zonas**, con la ciudad como dato del lead, del perfil, del evento y del panel.

Cuando abras Valencia, el valenciano lee «Valencia», no «Venezuela». El cuerpo de las tarjetas de reconocimiento usa «aquí» y no nombra ciudad, porque esas historias son ciertas en cualquier ciudad venezolana.

El bloque de las siete ciudades deja de ser una excepción y pasa a ser la pregunta normal de en qué ciudad estás.

### 1.4 · Nada simulado en la landing

- El contador cuenta **al cierre de la fecha**, no a una mesa que quizá no exista. Si la fecha no llena, cierra sin que nadie vea un cero vacío.
- **Los anillos de progreso por zona se van.** Queda el umbral —«una zona abre con doce personas que puedan llegar»— sin barra. Cuando tengas números reales, se enseñan: «faltan cinco» vale más que cualquier anillo, porque convierte al visitante en la pieza que falta.

### 1.5 · Formatos

Cenas con sus días. Drinks, movimiento y coffee con **«Próximamente»** y sin calendario. Anunciar cuatro formatos operando uno era la pérdida de credibilidad más barata de evitar.

El hero lo dice de frente: *«Un club para conocer gente en tu ciudad. Empezamos por la cena…»*.

### 1.6 · Días

Nueve opciones: se añaden **sábado y domingo por la mañana**. La ayuda explica por qué, que antes no se entendía: no todo es cena, también hay café de sábado y planes de domingo temprano.

### 1.7 · Zonas de la landing

El Hatillo y La Trinidad entran al top 10 en posiciones 7 y 8. Sebucán y El Cafetal salen de la landing pero **siguen en las trece del cuestionario**.

---

## 2 · Respuesta a `PARA-DESIGN-componentes-anadidos.md`

Los dieciocho están bien resueltos. Apruebo dieciséis sin cambios, retoco uno y te discuto otro.

**Aprobados y ya incorporados al sistema:** 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16.

Tres que quiero destacar porque son mejores que lo que yo había entregado:

- **El 3, el esqueleto en verde de marca.** Que un gris neutro se vea sucio sobre el crema es exactamente el tipo de detalle que yo debería haber previsto y no previne.
- **El 7, «qué hay que revisar».** Tenías razón: mi sello `REVISAR` no decía qué revisar, y mezclaba las roturas con «3 y 3», que no es un problema. El fallo era mío.
- **El 10, el freno al publicar.** «Publicar igualmente» en marrón de aviso y no en primario es la decisión correcta, y que quede registrado quién lo aceptó es lo que lo hace defendible.

**El 6 — las dos cosas que quitaste de Verificación: de acuerdo, y no las necesito.** Eran cromo de maqueta del mismo tipo que los `DEMO ·`. Para enseñar el diseño me basta con los hashes, que ya usamos en Mi mesa.

**El 17, el modal: apruebo, con un matiz.** Interrumpir es correcto porque bloquea. Pero el modal necesita salida por Escape y por clic en el velo, y el foco tiene que volver al botón que lo abrió. Si eso no está, un teclado se queda atrapado.

**El 18, la barra fija: aquí sí te discuto, pero no la quito.**

Tienes razón en el diagnóstico —decidir no puede exigir scroll— y en que es tu terreno tanto como el mío. Mi objeción es de una regla del sistema: **la barra mete dos acciones permanentes en pantalla, y una de ellas, «publicar», es primaria.** El sistema dice que nunca hay dos primarios en la misma vista, y con la barra fija hay uno abajo siempre y otro dentro de cada tarjeta.

Mi versión: **la barra se queda, pero «publicar» dentro de ella es secundario** —borde, no relleno— porque el camino normal ahora es publicar mesa por mesa. La barra es el atajo para cerrar todo cuando ya está revisado, no la acción principal. La lista de espera y la zona de soltar se quedan igual: eso es lo que de verdad justifica la barra.

Si al montarlo ves que en la práctica la gente publica en bloque y no mesa por mesa, dímelo y le devuelvo el primario.

---

## 3 · Respuesta a `PARA-DESIGN-journey-y-locales.md`

**El Journey está viejo y es culpa mía.** Los cuatro puntos son correctos. Lo actualizo en la próxima tanda con esto:

- **Paso 06 reescrito con tu distinción**, que es la que yo había contado mal: el miembro **no elige zona, acepta zonas**. Nosotros ofrecemos, él marca en cuáles le sirve, nosotros decidimos dónde se sienta. Y el precio explícito: si aceptó dos zonas, hasta las doce sabe «Las Mercedes o El Rosal». Esa frase tiene que estar en la pantalla, no solo en el Journey.
- **Paso 08: siete reglas duras, no tres señales.** Y tienes razón en el matiz de fondo — no son señales, son condiciones: si una se rompe, la mesa no debería existir. Mi palabra estaba mal elegida.
- **Paso 08: publicación por tandas**, con deshacer y con el freno.
- **La rama de cancelar** con tu precisión: rehace el reparto de las mesas **abiertas**; si la suya ya se cerró, hay que deshacerla o se queda en cinco.
- **Y el punto que más me gustó:** el punto de no retorno no es publicar, es la revelación. Eso merece estar escrito en el Journey, porque cambia cómo se opera.

**La pantalla de locales la diseño en la próxima tanda.** Tus dos preguntas, respondidas:

**¿Ficha propia además de la lista? Sí.** La lista sirve para elegir mientras armas una mesa —zona, formato, aforo, ruido, disponible o no— pero las decisiones de dinero y de renovación necesitan el histórico junto, y el histórico no cabe en una fila. La lista es para operar; la ficha es para decidir con quién seguimos.

**¿La foto de la entrada aporta? Sí, y es la única que aporta.** Alguien que llega de noche a una calle que no conoce necesita reconocer la puerta. No es decoración: es la misma función que «cómo llegar». Y va donde se usa —el correo del jueves y Mi mesa—, no solo en el panel. Nada de fotos de plato.

Una tercera cosa que no preguntaste y que sí haría: **el nivel de ruido de 1 a 3 no puede ser un número en el panel.** Quien elige sitio para una mesa que viene a conversar necesita leerlo sin traducir. Va como etiqueta —«se puede conversar» / «suena alto»— con el número detrás.

---

## 5 · Cada pantalla: de dónde se llega, qué guarda, qué viene premarcado

Me pediste estas tres cosas por pantalla y tienes razón: las cuatro cosas que cazaste no habrían pasado. A partir de aquí van en todas las entregas.

### Landing

**Entra desde:** campaña, directo. **Sale a:** `#registro` (mismo scroll), `Entrar`, `Legal`.

**Guarda:** dos veces. Al validar el correo escribe `correo` + `ciudad` — ese es el guardado que salva al que abandona. Al terminar las cuatro preguntas escribe todo.

**Premarcado:** nada. Las cuatro preguntas arrancan vacías a propósito: son las que deciden el reparto y una respuesta que nadie tocó no es una respuesta.

### Cuestionario

**Entra desde:** Agradecimiento, Mi cuenta (estado «termina tu perfil»), y el correo de bienvenida. **Sale a:** `Verificacion` tras crear la cuenta.

**Guarda:** al tocar **y al pasar de pantalla**. Lo segundo es tu arreglo y es el correcto: reenviar lo que hay en la pantalla, no solo lo que se tocó.

**Premarcado — y esto es lo que faltaba decir:**

| Campo | Valor | Por qué |
|---|---|---|
| `idiomas` | `['Español']` | En Venezuela es la respuesta de casi todos |
| `arraigo`, `zonas`, `dias`, `temas` | lo respondido en la landing | Herencia; la pregunta se oculta y se avisa en pantalla |

Las heredadas ya se guardaron en la landing. **`idiomas` no**, y ese era el bucle.

**Progreso: 14 de 14, no 17.** Tres son opcionales y no cuentan:

| Pregunta | Pantalla |
|---|---|
| `romance` | 2 · Cómo eres en la mesa |
| `evitar` | 3 · De qué hablas |
| `dieta` | 5 · Logística |

Las tres dicen OPCIONAL en pantalla. Que además contaran para el progreso era una contradicción mía, no un despiste tuyo.

### Perfil miembro

**Entra desde:** cola de verificaciones, y la flecha `→` de cada comensal en una mesa. **Sale a:** de vuelta al origen — la vuelta cambia el texto según de dónde vino.

**Guarda:** nada. Es solo lectura salvo aprobar o rechazar, que escribe en la verificación, no en el perfil.

**Premarcado:** nada.

**Dos estados del documento**, y el segundo no es una carencia: a los 90 días la foto se borra y queda la marca de que la verificación ocurrió y quién la aprobó. Es lo que prometimos en el legal.

### Mi cuenta

**Entra desde:** `Entrar`, `Verificacion`, el logo desde cualquier pantalla de miembro. **Sale a:** según el estado — `Datos base`, `Cuestionario`, `Verificacion`, `Pago`, `Mi mesa`.

**Guarda:** nada. Lee estado.

**Premarcado:** nada. El filtro de la agenda arranca en «todo».

### Verificación

**Entra desde:** Mi cuenta, Cuestionario al crear la cuenta. **Sale a:** `Mi cuenta`.

Y gracias por cazar los tres enlaces cuyo texto no coincidía con su destino. «Ir a mi cuenta» llevando a la landing pública no es un enlace mal puesto: es echar a alguien de su propia sesión justo después de pedirle la cédula. El peor sitio del recorrido para eso.

**Guarda:** las dos capturas y el resultado. **Premarcado:** nada.

---

## 6 · Reglas que siguen en pie

Las ocho del `HANDOFF.md` §3 y las tres del `HANDOFF-2.md`. Recordatorio de las que más se rompen:

1. **Un solo indicador de selección**: aro de 20px que se rellena de terracota. Esta tanda corrigió dos sitios de la landing donde había sobrevivido un anillo de 38px de una versión anterior.
2. **Ningún control bajo 44px.**
3. **Nunca el foco azul del navegador.** Hay `:focus-visible` propio; la landing lo tenía sin definir y salía azul en las pastillas de ciudad.
4. **Terracota clara `#C0662F` no lleva texto pequeño.** Para eso está `#8F4515`, y `#6E340F` cuando hace falta AAA.
5. `em { font-style: normal }` — Young Serif no tiene itálica.
6. **Nada dice «algo salió mal».**
7. **Nada simulado que se lea como dato.**
8. **Un valor por defecto es una respuesta que alguien tiene que guardar**, no decoración.
9. **«Opcional» en pantalla y «opcional» en el contrato son el mismo dato.** Si no cuenta, no cuenta en el progreso.
10. **Una pantalla sin entrada es una pantalla que no existe.**
11. **El texto de un enlace y su destino dicen lo mismo.**

---

## 7 · Pendiente mío

**Las dos fotos de Caracas** de «conoces la ciudad» y «vienes de visita». Son las dos únicas imágenes remotas que quedan —tiran de Wikimedia, que no permite descarga desde aquí y que el exportador no puede incrustar—. Necesitan material propio. Todo lo demás está en `fotos/`.
