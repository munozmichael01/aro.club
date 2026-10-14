# Brief para Design: el anfitrión de la mesa

Para la app y la web. Pedido el 14-10-2026, **con prisa: lo usamos el viernes
16 y el sábado 17**. Mientras llega el diseño, la app sale con una versión
hecha con los componentes del sistema; el diseño la reemplaza después.

## El problema

Feedback de la cena de los creadores (10-10): **falta alguien que marque el
ritmo.** La gente no sabe cuándo pedir, cuándo sacar el juego, cuándo cerrar
ni qué hacer después. En Madre la mesa se quedó tres horas y el restaurante
tuvo que pedir la mesa. Y quien no la está pasando bien no tiene una salida
natural.

No hay presupuesto para poner a alguien de Aro en cada mesa. La solución
tiene tres piezas.

## Pieza 1 · El hablador, ahora como guion de la noche

El hablador anterior (`BRIEF-hablador.md`) **casi no se leyó**: eran reglas, y
nadie lee normas mientras pide. Ahora es **el guion de la noche**.

**Condición dura: un solo hablador para todos los locales, zonas y horas.**
Nada de horas fijas ni de bares concretos: solo **momentos**.

Texto propuesto (Design puede ajustar el tono):

> **Cuando estén los seis, que alguien lea esto en voz alta.**
>
> **Esta noche**
> **Al llegar.** Una vuelta rápida: tu nombre y qué haces cuando no trabajas.
> **Cuando estén todos.** Pidan con calma.
> **Si se hace un silencio.** En Mi mesa hay un juego: una persona lee y responden todos.
> **Antes de que cierre la mesa.** Última ronda. Si hay ganas de seguir, busquen un sitio cerca.
> **Al despedirse.** Si alguien te cayó bien, díselo. Mañana te preguntamos qué tal.
>
> *Detrás, en pequeño:* escucha y deja espacio a los demás · aquí nadie es su cargo · siempre se puede pasar · la cuenta, cada quien lo suyo · @somos.aroclub

Lo que pedimos:
- **Que se vea.** Más grande que el anterior (A5 en vertical o un formato de
  tienda más alto), y pensado para poner uno en cada punta de una mesa larga.
- **La primera línea es una instrucción**, no un título: el ritual de leerlo
  en voz alta es lo que hace que funcione.
- Sigue llevando el QR a `aro.club/mesa`, pequeño.
- Entrega como la otra vez: PDF con sangrado y un PNG por cara.

## Pieza 2 · El anfitrión, una de las seis personas

Cada mesa tiene **una persona propuesta para llevar el ritmo**. Se elige entre
quienes respondieron **«Suelo llevar la conversación»** en «En una mesa con
gente que no conoces, ¿cómo eres?». Si nadie lo eligió, alguien que dijo
«Depende del momento». La elige el servidor.

Pantallas, en **Mi mesa** (fase abierta), debajo de «Con quién cenas»:
1. **Para la persona anfitriona:** una tarjeta «Esta noche llevas tú el
   ritmo», con un botón «Ver el guion». Tono: una invitación, nunca una
   obligación. «Si no te provoca, no pasa nada: el guion también lo tienen
   los demás».
2. **Para el resto:** una línea discreta, «Esta noche lleva el ritmo
   [nombre]». Si no hay anfitrión, no sale nada.
3. **El guion de la noche**, visible para todos: los mismos momentos del
   hablador, pero **con la hora real de esa mesa** (la app la conoce). Por
   ejemplo, para una cena de las 7:30 con la mesa hasta las 10:00:
   - 7:30 · Al llegar
   - 7:45 · Pidan
   - 8:00 · El juego, si hace falta
   - 9:30 · Última ronda
   - 10:00 · Cierra la mesa
   El momento actual resaltado, como un paso a paso.

## Pieza 3 · Los avisos, para quien tenga la app

Los mismos momentos como notificación, **solo a la persona anfitriona**,
para no poner a vibrar seis teléfonos a la vez. «Ya es hora de pedir», «Si
se hace un silencio, el juego», «Quedan 30 minutos de mesa». Copy en el mismo
tono.

## Lo que queda fuera por ahora

- Proponer un bar concreto para el segundo plan: depende del local y la zona.
- Intercambiar contactos dentro de la app: va aparte.
