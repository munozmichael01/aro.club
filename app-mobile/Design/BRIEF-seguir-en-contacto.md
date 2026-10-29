# Brief para Design · Seguir en contacto después de la cena

**Para:** Design. **De:** Michael, con el agente de la app. **Fecha:** 29-10-2026.

## Qué es

Dos personas de la misma mesa pueden seguir en contacto si **las dos** quieren.
No hay chat ni perfiles a la vista, y nadie se entera de que alguien lo marcó si
no hubo coincidencia. Lo vio Michael en Timeleft, que lo hace con perfiles y chat
uno a uno. Nuestra versión es mucho más corta, para no volvernos una red social
ni una app de citas.

## Lo que ya existe (no se diseña)

**Paso 1, en la encuesta de después.** La pregunta opcional ya está en
producción, en la app y en la web: «¿Te gustaría seguir en contacto con alguien
de la mesa?». Debajo lleva la nota «Solo se lo decimos si esa persona también te
marcó a ti». Se marcan cero, una o varias personas de esa mesa. A quien se
marcó como ausente, a quien se bloqueó y a quien se reportó no se le puede
marcar.

## Lo que hay que diseñar

### 1. El aviso de que hubo coincidencia (correo y push)
- **Cuándo sale:** cuando las dos personas se marcaron entre sí. Sale a cada una
  por separado. Si solo una marcó, no sale nada, nunca.
- **Qué dice:** algo como «Andrea también quiere seguir en contacto contigo».
  Con su nombre, sin apellido y sin foto, como en Mi mesa. Dice de qué cena se
  conocieron.
- **El botón** lleva a la pantalla 2.
- **El plazo:** dice cuántos días tiene para confirmar (7).

### 2. «¿Qué le compartimos?» (app y web)
La pantalla de confirmación. Aquí se resuelve qué pasa si alguien no tiene
Instagram: la persona elige qué compartir, y nada sale sin que lo confirme.
- **Instagram:** campo vacío, con «@».
- **WhatsApp:** viene relleno con el teléfono de su perfil, y se puede editar.
- Se puede compartir uno, el otro o los dos. Sin ninguno no se puede confirmar.
- Botón «Compartir» y una salida para no compartir nada («Prefiero no»), que
  no se le dice a la otra persona.
- **Nota que tiene que quedar clara:** «Solo se lo mandamos si Andrea también
  confirma. Si no, no se comparte nada de ninguna de las dos».

**Estados de la pantalla:**
- **A · Por confirmar.** Muestra el formulario y lo que falta del plazo.
- **B · Confirmaste, esperando a la otra persona.** Muestra lo que elegiste y
  se puede cambiar mientras tanto.
- **C · Las dos confirmaron.** Muestra lo que te compartió la otra persona
  («@andrea» o su WhatsApp, con botón para abrirlo) y lo que le compartiste tú.
- **D · Se pasó el plazo, o la otra persona no confirmó.** No dice cuál de las
  dos cosas pasó. Algo como «Esta vez no se cruzaron los datos».
- **E · Elegiste no compartir.** Se puede deshacer mientras dure el plazo.

### 3. El correo final
Cuando las dos confirmaron, cada una recibe lo que eligió la otra. Por ejemplo:
«Andrea te deja su Instagram: @andrea». Lleva el botón para abrirlo
(instagram.com o wa.me).

### 4. Dónde se ve después, en Mi mesa
En la Mi mesa de esa cena ya pasada, una tarjeta pequeña que lleva a la
pantalla 2, en el estado que toque:
- con la coincidencia por confirmar: «Andrea también quiere seguir en contacto»;
- con las dos confirmadas: «Coincidiste con Andrea».
Si no hubo coincidencia, no aparece nada.

## Reglas

- Solo entre personas de la **misma mesa** y de **esa fecha**.
- **El veto de tres meses sigue igual.** Esto no reparte mesas: no vuelven a
  coincidir antes por haberse marcado.
- **Quien marcó y no fue marcado no ve nada**, ni ahora ni después.
- **El bloqueo y el reporte mandan:** si cualquiera de las dos bloqueó o
  reportó a la otra, no hay coincidencia aunque las dos se hayan marcado.
- **El dato se comparte una sola vez:** va en el correo final y en el estado C,
  y solo para esa pareja. No se ve en ningún otro sitio.
- **Plazo:** se marca mientras la encuesta está abierta. Desde la coincidencia
  hay 7 días para confirmar.

## Voz y forma

- Copy de Aro: sin guiones largos (—), sin masculino genérico, en venezolano.
- Nada de corazones, «match» ni lenguaje de citas. Es seguir en contacto, no
  ligar.
- Iconos SVG del sistema, sin emojis.
- Lo mismo en app (390 px) y en web (escritorio y por debajo de 720 px).

## Qué entregar

1. El correo de coincidencia y el correo final. La push es una sola línea.
2. «¿Qué le compartimos?» en sus estados A a E, en app y en web.
3. La tarjeta de Mi mesa en sus dos estados.

Los textos los propones tú y los aprueba Michael.
