import 'server-only'

/**
 * «Son cuatro», dicho una sola vez para los tres sitios que lo cuentan.
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
 */

const EN_LETRA = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho']
const letra = (n: number) => EN_LETRA[n] ?? String(n)

export function fraseDeMesaCorta(
  enLaMesa: number,
  porMesa: number,
  cancelaronDeEstaMesa: boolean,
): string {
  if (!(enLaMesa > 0 && enLaMesa < porMesa)) return ''

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
    : `Son ${letra(enLaMesa)}: esta vez no nos cuadró el sexto puesto.`
}
