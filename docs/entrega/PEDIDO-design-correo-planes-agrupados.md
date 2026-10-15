# A Design · Correo nuevo · Los avisos del día, en uno solo

Hace falta **una sola pieza**: el correo que lleva **todos los avisos que le
tocan a una persona ese día**, cuando es más de uno. Hoy sale un correo por
cada aviso, y ese es el motivo de la pieza.

Avisos son dos cosas, y las dos pueden caer el mismo día:

- **se abrió** una fecha en una zona suya;
- **se cierra mañana** una fecha suya a la que todavía no se apuntó.

El resto de los correos —el pago, la verificación, la mesa— no entran aquí:
contestan a algo que la persona acaba de hacer y siguen saliendo solos.

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

**La regla nueva, entera:** un aviso al día por persona, y si ese día le tocan
tres, van los tres en este correo.

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

### Las filas son de dos clases, y no dicen lo mismo

Esto es lo segundo que hay que resolver: en el mismo correo pueden ir una fila
de «se abrió» y otra de «se cierra mañana», y **no pueden leerse igual**. La
primera es una invitación y la segunda es un plazo. Si se ven iguales, o la
invitación mete prisa que no tiene, o el plazo pasa desapercibido.

No hace falta un bloque aparte para cada clase si encuentras una forma mejor:
lo que pido es la distinción, no la estructura.

### Los datos de cada fila

Todos existen y van en el correo sin pedir nada más:

| | ejemplo |
|---|---|
| clase | se abrió · se cierra mañana |
| plan | Brunch · Cena · Drinks · Caminata |
| día | domingo 25 de octubre |
| hora | 11:00 a.m. |
| zona o zonas | Chacao · Chacao y Los Palos Grandes |
| precio | 10 ref la plaza |
| cuándo cierra (solo en las de plazo) | mañana a las 7:30 p.m. |

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

- **El correo de un solo aviso.** Siguen siendo los de hoy, tal cual: el de
  «abrimos tu zona» y el de «se cierra pronto». Esta pieza es solo para cuando
  hay más de uno.
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
