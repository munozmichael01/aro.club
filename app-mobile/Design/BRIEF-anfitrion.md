# Brief para Design: el paso a paso de la mesa

Para la app y la web. Pedido el 14-10-2026 y **revisado el mismo día con
Michael**. Lo usamos el viernes 16 y el sábado 17: mientras llega el diseño, la
app sale con una versión hecha con los componentes del sistema (capturas en
`Entregas/anfitrion/`). **Design define las pantallas**; el copy de abajo ya
está aprobado.

## El problema

Feedback de la cena de los creadores (10-10): **falta alguien que marque el
ritmo.** La gente no sabe cuándo pedir, cuándo sacar el juego, cuándo cerrar
ni qué hacer después. Una de las chicas llegó tarde y el resto esperó con
hambre. La mesa se quedó tres horas y el restaurante tuvo que pedirla.

No hay presupuesto para poner a alguien de Aro en cada mesa. **Se descartó
que el servidor elija un anfitrión** (correo, aceptar o rechazar, desempates:
demasiado lío). La solución: un paso a paso que ve toda la mesa, y **la propia
mesa elige a «la voz de Aro»**, una persona que lo va leyendo en voz alta. No
es su guion: es nuestro mensajero.

**Nada de «noche»** en el copy: no siempre será de noche. El brunch y el café
usarán la misma pieza con sus propios momentos.

## Pieza 1 · «Paso a paso» en Mi mesa (fase abierta)

Lo ve toda la mesa, con **la hora real de esa mesa**. Las horas salen de la
hora de la cena y de hasta cuándo nos deja la mesa el restaurante (si no lo
sabemos, dos horas). El momento actual va resaltado con «AHORA»; los pasados,
apagados. Dos momentos pueden compartir hora.

**Título:** Paso a paso
**Bajada:** Una guía, no un horario. Cada mesa va a su ritmo.

Ejemplo para una cena de 7:30 a 9:30:

| Hora | Momento | Texto |
|---|---|---|
| 7:30 | Mientras llegan | Pidan algo de tomar si quieren. Esperamos a todos hasta las 7:45. |
| 7:45 | La voz de Aro | Antes de pedir, elijan a alguien que vaya leyendo en voz alta cada momento de esta lista. Si nadie se ofrece, le toca a quien llegó de último. |
| 7:45 | A pedir | Falte quien falte, pidan la comida. Quien llegue después se suma sin problema. |
| 7:50 | Una vuelta rápida | Tu nombre y qué haces cuando no trabajas. |
| 8:05 | Para romper el hielo | Mientras llega la comida, la primera ronda del juego. |
| 8:30 | Si se acaba el tema | Sigan con el juego donde lo dejaron. Se puede pasar. |
| 9:00 | Lo último y la cuenta | Pidan lo último que les provoque y luego la cuenta, cada quien lo suyo. Puede haber otra reserva esperando la mesa. |
| 9:30 | Despedida | Si hay ganas de seguir, busquen un sitio cerca. Si alguien te cayó bien, díselo. |

Lo que pedimos:
- Dónde va en Mi mesa y cómo convive con la tarjeta del juego (los dos
  momentos del juego podrían llevar a ella) y con la tarjeta «Al llegar».
- Los tres estados: antes de la cena (nada resaltado), en curso, terminada.

## Pieza 2 · Los sitios para seguir

En la despedida, si operación eligió sitios para ese local, aparecen **hasta
tres**, cada uno con su nombre, **su distancia a pie** y un botón **«Cómo
llegar»**. Si no hay, solo la frase genérica. Pensado también para un bar
hopping después de cenar.

**Rótulo:** Si quieren seguir · **Distancia:** «4 min a pie» · **Botón:** Cómo llegar

Lo que pedimos: cómo se ven esos sitios (¿tarjetas, lista, con foto?) y qué
pasa si uno no tiene distancia o mapa.

## Pieza 3 · El hablador, como guion de la mesa

El hablador anterior (`BRIEF-hablador.md`) **casi no se leyó**: eran reglas, y
nadie lee normas mientras pide. **Un solo hablador para todos los locales,
zonas y horas:** solo momentos, sin horas ni bares.

> **Cuando estén los seis, elijan quién lee esto en voz alta.** El paso a paso
> con las horas de su mesa está en la app, en Mi mesa.
>
> **Mientras llegan.** Esperen 15 minutos como mucho.
> **A pedir.** Falte quien falte. Quien llegue después se suma.
> **Una vuelta rápida.** Tu nombre y qué haces cuando no trabajas.
> **Para romper el hielo.** La primera ronda del juego, en Mi mesa.
> **Si se acaba el tema.** Sigan con el juego donde lo dejaron.
> **Lo último y la cuenta.** Cada quien lo suyo. Puede haber otra reserva esperando.
> **Despedida.** Si alguien te cayó bien, díselo.
>
> *Detrás, en pequeño:* escucha y deja espacio a los demás · aquí nadie es su cargo · siempre se puede pasar · @somos.aroclub

- **Que se vea:** más grande que el anterior (A5 en vertical o más alto), uno
  en cada punta de una mesa larga.
- **La primera línea es una instrucción**, no un título.
- QR pequeño a `aro.club/mesa`.
- Entrega: PDF con sangrado y un PNG por cara.

## Lo que queda fuera por ahora

- Avisos (push) por momento: sin anfitrión no hay a quién mandarlos sin poner a
  vibrar seis teléfonos. Sigue la del juego, que ya existe.
- Intercambiar contactos dentro de la app: va aparte.
