# Petición a Design · Perfil del miembro visto por Operación

Lee `HANDOFF.md` §2.1 antes de empezar: los códigos de zonas, temas, sectores
y arraigo son los del contrato y no se reescriben.

## Qué es

Una pantalla nueva, `Aro Club - Perfil miembro.dc.html`, que **solo ve
Operación**. No es "Mi perfil" (esa ya existe y es la del propio miembro).
Esta es la ficha completa de una persona para poder decidir sobre ella:
aprobar su verificación, entender por qué cayó en una mesa, o mirar qué pasó
cuando alguien la reportó.

Se llega desde dos sitios, y los dos existen ya:

- **La cola de verificaciones** (`Aro Club - Operacion.dc.html`, pestaña
  Verificaciones): desde la tarjeta de cada persona.
- **Una mesa del reparto** (misma pantalla, pestaña Mesas): cada comensal
  tiene una flecha `→` a su ficha. Es el caso que más se va a usar: estoy
  mirando una mesa, no me cuadra alguien, quiero ver quién es.

Hace falta el camino de vuelta a donde se venía.

## Qué lleva

**1 · Identidad**
Nombre completo, cómo le llaman en la mesa, edad, género, teléfono, correo,
y desde cuándo es miembro. El nombre completo y el teléfono son de uso
interno: que se note que no es información que se comparte.

**2 · Verificación**
Estado (verificada / en revisión / rechazada / sin empezar), quién la
aprobó, cuándo, si el nombre y la edad coincidían con el documento, y el
motivo si se rechazó.

Dos cosas importantes aquí:

- **Las fotos se borran a los 90 días** y la ficha sobrevive sin ellas. Hay
  que diseñar los dos estados: con documento visible y sin él. El segundo no
  es un error ni una carencia, es lo que prometimos.
- Si se le rechazó alguna vez, cuántas y por qué. Cinco intentos con
  documentos distintos no es mala suerte con la cámara.

**3 · Historial de mesas**
Cada cena a la que fue: fecha, restaurante, zona, con quién se sentó, si
asistió, y qué valoró después. Es lo que hace falta para entender a alguien
antes de sentarlo otra vez.

Estados vacíos que van a existir de verdad: alguien verificado que aún no ha
cenado ninguna vez, y alguien que canceló todas.

**4 · Lo que respondió**
Sus diecisiete respuestas del cuestionario, agrupadas como en el propio
cuestionario. Es lo que alimenta el reparto, así que operación tiene que
poder verlo tal cual.

**5 · Señales**
A quién ha bloqueado, quién la ha bloqueado, si ha reportado a alguien o la
han reportado. Los reportes llevan un motivo interno que **nunca** se le
enseña a la persona reportada: que la pantalla deje claro cuál es cuál.

**6 · Créditos**
Cuántos le quedan y el movimiento: cuándo compró, cuándo gastó, si se le
devolvió algo.

## Lo que NO lleva

- **Ninguna acción destructiva.** Esta pantalla es para mirar. Aprobar y
  rechazar siguen en la cola; bloquear y excluir irán en su propio sitio
  cuando toque. Una ficha que también borra invita a borrar mirando.
- **Nada del otro lado.** Aquí no se ve qué le enseñamos a ella.

## Una decisión que ya está tomada, para que no la rehagas

Al miembro, en su propia pantalla, **solo le enseñamos cuántas cenas lleva**.
Ni con quién ni cuándo. Aro no es una agenda de contactos: el detalle del
historial vive aquí, en operación, y no en su perfil.

## Reglas que siguen vigentes

- Códigos estables de `HANDOFF.md` §2.1. Nunca por índice ni por etiqueta.
- Nada de cifras derivables escritas a mano: si sale de un dato, se calcula.
- Sin botones `DEMO ·` ni conmutadores de dispositivo.
- Ningún control por debajo de 44px.
- `em { font-style: normal }`.
- Nada dice "algo salió mal".
- Contraste AAA.
