import 'server-only'

/**
 * «Son cuatro», «son siete», dicho una sola vez para los tres sitios que lo
 * cuentan.
 *
 * El correo de la revelación, Mi mesa en la web y Mi mesa en la app. Michael,
 * 22-10: la pantalla no decía NADA cuando la mesa salía corta, así que esa
 * gente leía la explicación en el correo y abría una pantalla que pintaba «4
 * personas» como si fuera lo normal. La que más se mira es la pantalla.
 *
 * Y va en una función y no copiada en cada sitio por lo de siempre: tres
 * copias de una frase acaban siendo tres frases.
 *
 * Las variantes de cuatro las aprobó Michael palabra por palabra el 22-10.
 * El corte es DOS HUECOS, no «igual a cuatro»: con cinco se habla del sexto
 * puesto, que es verdad, y con cuatro o menos se dice el número y se dice lo
 * que pensamos, que es la decisión que se tomó al publicarla.
 *
 * ---
 *
 * Y DESDE EL 24-10, TAMBIÉN HACIA ARRIBA. Michael: «el ajuste de la mesa +2
 * (hasta 8) y -2 (hasta 4), y que esté el texto controlado».
 *
 * Por arriba esto devolvía cadena vacía y no salía nada: a esa persona se le
 * dijo «cenas con cinco personas» al reservar y el día de la cena le llegaban
 * seis nombres sin una palabra. Nadie le mentía en la revelación, porque ahí
 * ya no se afirma ningún número, pero tampoco se le reconciliaba con lo que
 * había leído.
 *
 * Una mesa se pasa por la misma razón por la que se queda corta: sobran una o
 * dos personas que no dan para otra mesa, y la alternativa es dejarlas sin
 * cena. Eso es lo que dice la frase, y es verdad.
 */

/**
 * Hasta VEINTIDÓS, que es el techo de verdad.
 *
 * Se quedaba en ocho, que es lo que necesitaba una cena. Una caminata se
 * abre con doce, y nueve de doce salía como «Son 9: esta vez no completamos
 * la mesa de 12», con los números en cifras en medio de la frase.
 *
 * Y veinte tampoco bastaba. `seats_per_table` llega a veinte, pero una mesa
 * se estira `DE_MAS` por encima: veintidós es el número más grande que puede
 * acabar dentro de una de estas frases. Lo cazó el agente de la app
 * haciendo esta misma tabla, y tenía razón.
 *
 * En femenino porque cuenta personas, como el «una» de arriba: veintiuna, no
 * veintiuno.
 */
const EN_LETRA = [
  'cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho',
  'diecinueve', 'veinte', 'veintiuna', 'veintidós',
]
const letra = (n: number) => EN_LETRA[n] ?? String(n)

/**
 * «El sexto puesto», cuando la mesa es de seis.
 *
 * La frase de Michael dice «sexto» porque una cena es de seis, y eso estaba
 * escrito a mano dentro de una rama que ya recibía `porMesa`: en una
 * caminata de veinte salía «Son diecinueve: esta vez no nos cuadró el sexto
 * puesto». Apareció al imprimir la tabla nueva, en la línea de al lado.
 *
 * La de seis se queda palabra por palabra, que está aprobada. Lo demás cae
 * en «el último puesto», que es verdad para cualquier tamaño y no obliga a
 * inventarse un ordinal para una mesa de diecisiete.
 */
const ORDINAL = [
  '', 'primer', 'segundo', 'tercer', 'cuarto', 'quinto', 'sexto', 'séptimo', 'octavo',
  'noveno', 'décimo',
]
const elPuestoQueFalta = (porMesa: number) =>
  ORDINAL[porMesa] ? `el ${ORDINAL[porMesa]} puesto` : 'el último puesto'

/**
 * Cuánto se puede estirar una mesa por arriba.
 *
 * Dos, y el panel no ofrece publicar más. Con tres de más ya no es una silla
 * extra, es otra mesa que no armamos, y la frase dejaría de ser verdad.
 */
export const DE_MAS = 2

export function fraseDeTamano(
  enLaMesa: number,
  porMesa: number,
  cancelaronDeEstaMesa: boolean,
): string {
  if (enLaMesa <= 0 || enLaMesa === porMesa) return ''

  // --- hacia arriba: siete u ocho donde caben seis ----------------------
  //
  // La misma frase para una de más y para dos: lo único que cambia es el
  // número y las concordancias, que es justo lo que pidió Michael. Decir dos
  // cosas distintas haría que la de dos sonara a excusa y la de una a aviso.
  if (enLaMesa > porMesa) {
    const sobran = enLaMesa - porMesa
    return sobran === 1
      ? `Son ${letra(enLaMesa)}: esta vez encajaba una persona más y preferimos sentarla aquí antes que dejarla sin mesa.`
      : `Son ${letra(enLaMesa)}: esta vez encajaban ${letra(sobran)} personas más y preferimos sentarlas aquí antes que dejarlas sin mesa.`
  }

  // --- y hacia abajo, como estaba ---------------------------------------
  if (porMesa - enLaMesa >= 2) {
    return cancelaronDeEstaMesa
      ? `Son ${letra(enLaMesa)}: se nos cayeron dos y no llegamos a sentar a nadie más, pero creemos que ${letra(enLaMesa)} desconocidos son suficientes para pasarla bien.`
      : `Son ${letra(enLaMesa)}: esta vez no completamos la mesa de ${letra(porMesa)}, pero creemos que ${letra(enLaMesa)} desconocidos son suficientes para pasarla bien.`
  }

  return cancelaronDeEstaMesa
    ? `Son ${letra(enLaMesa)}: alguien canceló y no llegamos a sentar a nadie más.`
    // Sin cancelación la mesa salió así, y eso también hay que justificarlo:
    // la promesa es de seis, y quien cuenta cinco merece saber por qué. Lo
    // que no vale es achacarle a alguien una cancelación que no ocurrió.
    //
    // Y la frase mira a lo nuestro, no a la persona: «no encontramos a nadie
    // que encajara contigo» se lee como que el raro eres tú, y eso lo lee
    // alguien que va a cenar con desconocidos en dos horas.
    : `Son ${letra(enLaMesa)}: esta vez no nos cuadró ${elPuestoQueFalta(porMesa)}.`
}
