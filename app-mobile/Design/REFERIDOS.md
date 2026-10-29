# Referidos · propuesta para que Michael decida

**Estado:** cifras decididas por Michael el 29-10-2026: **20% de descuento** para quien
llega, **una reserva gratis por cada 3 personas** que vayan a su primera cena, **sin tope**
por ahora. Textos aprobados el 29-10.

## La idea en una línea

Cada persona verificada tiene **su código**. Quien llega con él paga menos su
primera fecha, y quien invitó recibe algo **cuando esa persona va a su
primera cena**: no al darse de alta.

## 1. El código

- **Quién lo tiene:** solo las personas verificadas. Sin verificar no se
  reserva, así que tampoco se invita.
- **Cómo es:** el nombre de pila más tres letras, en mayúsculas: `ANDREA7KQ`.
  Se lee bien en una historia y se puede escribir a mano. Se genera solo, y
  es único.
- **Dónde vive:** en la tabla de cupones que ya existe (`coupons`), marcado
  como de referido y atado a quien lo creó. Así el canje usa lo que ya
  funciona: el campo de cupón de Pago y la regla de «un uso por persona»
  (`coupon_redemptions_uno_por_persona`).

## 2. Dónde aparece

| Sitio | Qué se ve |
|---|---|
| «Estás dentro», después de reservar | Las tarjetas para historias, con el código dentro (brief de Design) |
| Mi mesa · «Compartir mi plan» | Lo mismo, para quien cerró la pantalla |
| Perfil · «Invita a alguien» | El código, «copiar», «compartir el enlace» y cuántas personas entraron con él |
| Encuesta de después, solo si la puntuación fue alta | «¿Conoces a alguien a quien le gustaría? Tu código: …» |

## 3. Cómo se envía

Al compartir se manda **un enlace**: `aro.club/i/ANDREA7KQ`. La tarjeta lleva
el código escrito, por si alguien lo ve en una historia y no puede tocar.

El texto que acompaña al enlace va en la sección 7.

## 4. Cómo llega

- **Con la app instalada,** el enlace abre la app. Los enlaces universales ya
  están montados para los correos.
- **Sin la app,** abre la web: la portada de siempre, con una franja arriba:
  «Te invitó Andrea · tu primera fecha con 20% de descuento».
- El código queda **guardado** desde ese momento: en el navegador, y en el
  lead o el perfil cuando se dé de alta (`waitlist.source` / `profiles.source`
  y un campo nuevo `invitado_por`). No hay que volver a escribirlo.

## 5. Cómo se canjea

- **Sale solo** en Pago, en la primera fecha, ya aplicado: «Código de Andrea ·
  −20%». Se puede escribir a mano en el campo de cupón, como hoy.
- **Solo para la primera reserva pagada** de alguien que nunca ha reservado.
  Una persona no usa su propio código, y nadie usa dos códigos de referido.
- Si cancela a tiempo, el crédito vuelve como cualquier otro. El descuento ya
  aplicado no se repite en otra fecha.

## 6. La recompensa de quien invita

- **Una reserva gratis por cada 3 personas** que vayan a su primera cena con su
  código. Cuenta la **asistencia**, no el alta: es lo que impide que alguien se
  invente cuentas.
- Llega como **un crédito** a su cuenta, que ya sabemos mostrar y gastar, y se
  ve el avance en Perfil: «Llevas 2 de 3», con el conteo de la sección 7.
- **Sin tope** por ahora (Michael, 29-10). Si alguien abusa, se ve en Operación
  y se decide entonces.

## 7. Los textos (para que los apruebe Michael)

**Al compartir** (WhatsApp, historias o donde sea):
> Estoy en Aro Club: cenas con gente que no conoces, en grupos pequeños y
> todos verificados. El sitio lo eligen ellos. Con mi código ANDREA7KQ tu
> primera fecha tiene un 20% de descuento: aro.club/i/ANDREA7KQ

Vale para cualquier persona verificada, haya cenado o no, y desde cualquier
sitio desde el que se comparta (Michael, 29-10).

**Franja de la web y de la app** para quien llega con el enlace:
> Te invitó Andrea · tu primera fecha con un 20% de descuento

**En Pago,** ya aplicado:
> Código de Andrea · −20%

**Perfil · «Invita a alguien»:**
> Con tu código, la primera fecha de quien invites tiene un 20% de descuento.
> Cuando tres personas vayan a su primera cena con él, tu próxima reserva es
> gratis.
> Llevas 1 de 3 para tu próxima reserva gratis.
> Con tu código: 4 personas se apuntaron y 1 ya fue a su primera cena.

El conteo (Michael, 29-10) se ve siempre en Perfil: cuántas personas se
apuntaron con el código y cuántas ya fueron, y el avance hacia la siguiente
reserva gratis. Después de cada premio, el «de 3» vuelve a empezar.

**Correo a quien invitó,** cuando alguien asiste:
> Asunto: Andrés fue a su primera cena con tu código
> Llevas 2 de 3. A la tercera, tu próxima reserva es gratis.

**Y a la tercera:**
> Asunto: Tu próxima reserva es gratis
> Tres personas fueron a su primera cena con tu código. Ya tienes el crédito en
> tu cuenta: úsalo en la fecha que quieras.

## 8. Reparto del trabajo (cuando esté decidido)

- **Web y servidor (agente web):** generar los códigos, la ruta `/i/[código]`,
  la franja de la portada, guardar `invitado_por`, aplicar el descuento en
  `/api/pago`, dar el crédito al marcar la asistencia, el correo de premio y
  una vista en Operación.
- **App (agente de la app):** «Invita a alguien» en Perfil, el código en las
  tarjetas, abrir `aro.club/i/…` en la app y que Pago lo traiga aplicado.
- **Design:** las tarjetas y la franja, dentro del brief «Estás dentro».
