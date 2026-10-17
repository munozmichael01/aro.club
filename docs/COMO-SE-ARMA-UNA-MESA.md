# Cómo se arma una mesa, y cómo se elige el sitio

Escrito el 17-10-2026, el día que esto cambió. Son **dos decisiones
distintas** y conviene no mezclarlas:

1. **Con quién te sientas.** Lo decide el reparto, con reglas duras y una
   puntuación.
2. **Dónde cena esa mesa.** Se decide DESPUÉS, con la mesa ya armada.

Hasta hoy la segunda no era una decisión: era «el primer local de la zona que
tenga hueco». Y teníamos guardados los dos datos que hacían falta —la cocina
del local y la comida favorita de cada persona— sin que los leyera nadie. Así
es como estuvimos a punto de mandar a un hombre que come parrilla y venezolano
a un indio.

---

## 1 · Con quién te sientas

### Las reglas duras: si una se rompe, la mesa no existe

No hay puntuación que las compense. El panel se niega a publicar una mesa que
rompa alguna, y para saltárselas hay que pulsar **Publicar igualmente**, que
deja constancia de quién lo hizo.

| Regla | Qué impide |
|---|---|
| **Edad** | Más de 10 años entre el más joven y el mayor |
| **Género** | Más de dos de diferencia entre mujeres y hombres |
| **Empresa** | Dos de la misma empresa. Trabajar por cuenta propia no cuenta como empresa |
| **Veto** | Dos personas que se bloquearon, o que ya cenaron juntas en los últimos tres meses |
| **Gasto** | Dos tramos de distancia entre el más ajustado y el que más gasta |
| **Visita** | Más de dos personas que están de paso por la ciudad |
| **Zona** | Que no haya una zona que acepten los seis |
| **Idioma** | Que no haya un idioma común |
| **Sin nada en común** | Una pareja que no comparte **ni un interés ni un tema**. Es de hoy: lo que arruina una cena no es la media de la mesa, es el que no tiene de qué hablar con nadie |

### La puntuación: entre las mesas legales, cuál es mejor

| Término | Peso | Qué mide |
|---|---|---|
| Cohesión | 0,4 | Cuánta gente comparte al menos dos intereses o temas con el resto |
| Sector | 0,3 | Diversidad de a qué se dedican. Penaliza a partir de dos del mismo |
| Energía | 0,2 | Que haya dos o tres de los que llevan la conversación |
| Novedad | 0,1 | Penaliza mesas donde ya se conocían |
| Arraigo | 0 | Se calcula y se enseña, pero no puntúa |

**Ojo con la cohesión:** hoy da 1,00 en todas las mesas, porque basta
compartir dos intereses y con el catálogo actual eso lo cumple todo el mundo.
O sea: el 40% de la nota no está decidiendo nada. Está pendiente medirlo por
parejas en vez de con un umbral por persona.

---

## 2 · Dónde cena esa mesa

Con la mesa ya armada, se busca sitio entre los locales **de su zona** que
todavía tengan hueco esa noche.

### Lo que elimina un local, sin discusión

- **Que alguien de la mesa lo haya vetado.** Al contestar la encuesta se puede
  marcar «no me mandes más a este sitio», y eso no se negocia: no se le da ese
  local aunque sea el único libre. Caben dos a la vez por persona, solo
  aparece si le puso mala nota al sitio, y se quita desde Mi perfil.
- **Que no quepa.** El aforo del local en mesas es suyo, no nuestro.

### Y entre los que quedan, gana el que menos sume

```
repetidores × 3   −   cuántos comen lo suyo   +   tramos que se pasa × 2
```

- **Repetidores**: gente de esa mesa que estuvo en ese local en las últimas
  **seis semanas**. Pesa pero no prohíbe: con seis locales de cena en Chacao y
  una cena por semana, prohibir repetir en tres meses dejaría las mesas sin
  sitio.
- **Comen lo suyo**: cuántos tienen entre sus comidas favoritas alguna de las
  cocinas del local.
- **Tramos que se pasa**: el tramo del local menos el tramo **más ajustado de
  la mesa**. No la media: en una cena que se paga aparte, quien marcó «hasta
  20» es quien decide si la cuenta duele; los demás pueden gastar menos sin
  que les pase nada.

A igualdad de todo, el orden de siempre: el mismo pool tiene que dar el mismo
reparto.

### Cómo quedó contra la cena del 17-10

| Mesa | Fue a | Habría ido a | Por qué |
|---|---|---|---|
| 1 | Vittoria | Vittoria | 5 de 6 comen italiano |
| 2 | Masala | Vittoria o Masala | empatan, 3 de 6 cada uno |
| 3 | Mestre | Mestre | 5 de 6, y ni un tramo por encima |
| 5 | Pizza Tua | **Vittoria** | en Pizza Tua comen 2 de 5, y es un tramo por encima de su bolsillo |

---

## Lo que falta para que esto sirva del todo

- **Las cocinas de los locales.** Seis de los activos las tienen; los demás no,
  y sin eso ese término vale cero. Lo tiene que poner quien conozca el sitio.
- **El tramo de los locales.** Ocho de once lo tienen, y los que lo tienen no
  cuadran entre sí: Mestre está en tramo 1 con la misma cuenta media que
  Masala, que está en 2. Sale de lo que escribimos al dar de alta el local, no
  de lo que gasta la gente.
- **Lo que gasta la gente de verdad.** Desde el 17-10 la encuesta lo pregunta
  por tramos y opcional, y de ahí sale `v_gasto_de_local`. Con unas cuantas
  cenas, eso debería sustituir al tramo declarado.
- **Las dietas.** No son regla dura: se listan para que operación elija sitio
  con criterio, y se le dicen al restaurante. Decisión de Michael, 17-10.

---

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Reglas duras y puntuación | `src/lib/reparto/repartir.ts` |
| El pool y los locales asignables | `src/lib/reparto/pool.ts` |
| La elección de sitio | `sedeDe()` en `src/app/api/operacion/repartir/route.ts` |
| El veto de un local | `table_feedback.sitio_no_repetir`, y `/api/mis-sitios` para verlo y quitarlo |
| Lo que gasta la gente | `table_feedback.gasto_usd`, vista `v_gasto_de_local` |
