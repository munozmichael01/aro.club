# A Design · Correo nuevo · «Abrimos varios planes» (uno con N fechas dentro)

Hace falta **una sola pieza**: el correo de «abrimos mesa en tu zona» cuando lo
que se abrió no es una fecha, sino dos o tres. Hoy sale uno por fecha, y es el
motivo de la pieza.

**Por qué.** El 10-10 se abrieron dos fechas y salieron sesenta correos para
treinta personas; una recibió ocho avisos de apertura en total. No es un fallo
de la cola: las zonas se solapan casi del todo —aceptan Chacao 398 personas,
Altamira 352, Los Palos Grandes 350—, así que abrir dos fechas el mismo día es
escribirle dos veces a casi la misma gente, y el segundo correo no dice nada
que el primero no dijera. A partir de ahora los avisos salen **en dos tandas
diarias, 12:00 y 18:00, y como mucho uno por persona y día**. Cuando a alguien
le toca más de un plan en la misma tanda, recibe este correo en vez de dos.

Lo que el club promete por escrito en sus preguntas frecuentes es exactamente
esto: «Marca tus zonas y te escribimos el día que se abre la primera. No antes:
no queremos escribirte para nada».

---

## De qué parte

De `src/lib/correos-plantillas/11-abrimos-zona.html`, que es el correo que hoy
sale por cada fecha y que no se toca. Esta pieza es su versión de varias, así
que **tiene que leerse como el mismo correo**, no como uno nuevo: mismo
encabezado con el aro, misma cinta, mismo pie, mismos colores.

Los veintidós correos que existen están en esa carpeta y son el registro
completo. La envoltura va del mismo crema que la tarjeta (`#FAF3E4`): dos
cremas distintos se ven como un marco blanco.

## Lo que hay que resolver, que es solo una cosa

El correo de una fecha tiene **una pieza grande**: un bloque verde con el día
en Young Serif a 72 px y, debajo, «7:30 p.m., en Chacao». Eso es lo que no
escala: dos de esos bloques seguidos son dos correos pegados.

**Lo que pido es la fila de un plan cuando hay varios**, y la decisión de qué
pierde tamaño. Mi intuición, para que la discutas o la tires: el día deja de
ser el titular de 72 px y pasa a ser una lista de dos o tres filas, cada una
con día + hora + zona + qué plan es, y el titular pasa a ser la cuenta («Se
abrieron tres fechas en tus zonas»). Pero esa jerarquía es tuya.

### Los datos de cada fila

Todos existen y van en el correo sin pedir nada más:

| | ejemplo |
|---|---|
| plan | Brunch · Cena · Drinks · Caminata |
| día | domingo 25 de octubre |
| hora | 11:00 a.m. |
| zona o zonas | Chacao · Chacao y Los Palos Grandes |
| precio | 10 ref la plaza |

El precio es **por fecha**, no del club: hoy conviven fechas a distinto precio.
Si en la versión agrupada no cabe por fila, dilo y lo dejamos solo en el
titular cuando todas valen lo mismo.

### Cuántas filas

Dos o tres es lo normal. **Cuatro o más puede pasar** —cuatro zonas abiertas el
mismo día— y necesito saber qué hace la pieza ahí: ¿se cortan y se dice «y dos
más»? ¿Se apilan todas? No hace falta una segunda maqueta, basta con la regla.

### Un botón, no uno por fila

Lleva a `/cuenta#agenda`, que es donde están todas. Un botón por plan multiplica
la decisión y el correo no es el sitio para decidir: el sitio es la agenda.

## Lo que NO hay que resolver

- **El correo de una sola fecha.** Sigue siendo el de hoy, tal cual.
- **Qué fechas ve cada persona.** Eso lo decide el servidor: su zona, el plan
  que marcó, el día que marcó y su banda de edad.
- **El asunto.** Lo escribo yo y lo valida Michael.

## Las reglas de un correo, por si hace tiempo

- HTML de correo: **tablas**, nada de flex ni grid, estilos en línea, anchos
  en píxeles. 600 px de ancho, y por debajo de 620 px al 100 %.
- Las fuentes se cargan de Google y **hay que dar la alternativa**: Young Serif
  → Georgia, Inter Tight → Arial. Outlook no carga ninguna de las dos.
- Nada de imágenes que lleven texto. El único archivo es el aro de la cabecera.
- **Sin guiones largos en el copy.** Se reescribe la frase.
- El pie lleva «Ajustes de correo» y los términos, como los otros veintiuno.

## Qué espero recibir

El `.html` de la pieza, como las demás entregas: lo monto tal cual. Si
prefieres entregar la maqueta y que lo monte yo, también vale, pero entonces
necesito los píxeles exactos de la fila repetida.

**No bloquea nada.** Mientras llega, monto una versión mía con la tarjeta de
«abrimos tu zona» repetida, que es consistente pero no está diseñada. Cuando
entregues la tuya, se cambia y ya.
