import { MESES } from '@/lib/reglas'
/**
 * Fechas en castellano, en un solo sitio.
 *
 * Estaban dentro de una ruta de operación, y al necesitarlas en verificación
 * el camino fácil era copiarlas. Ese es literalmente el fallo que el §11 del
 * handoff enumera cinco veces: dos implementaciones del mismo dato que
 * acaban diciendo cosas distintas. Una fecha de borrado que no coincida con
 * la que ve operación es una promesa rota, aunque sea por un día.
 */

/**
 * La zona en la que habla el producto.
 *
 * Estas funciones usaban `getDate()` y `getMonth()` a secas, que es la hora
 * LOCAL DEL SERVIDOR. En Vercel eso es UTC, porque nadie la fija. Y una cena
 * del sábado 3 a las ocho de la noche de Caracas es medianoche del 4 en UTC:
 * la ficha de miembro del panel y las fechas de «revisada el» y «se borra el»
 * de `/api/verificacion` —que sí lee la persona— decían un día de más.
 *
 * Los correos ya formateaban en Caracas por su cuenta, así que además eran
 * dos relojes distintos para el mismo dato.
 *
 * Está en una constante y no repartida porque es lo que hay que cambiar el
 * día que `cities` tenga su columna de zona horaria: entonces el producto
 * hablará en la hora de la ciudad de cada cena, y no en la de esta.
 *
 * Y sale de `reglas.js`, no escrita aquí otra vez: el navegador la necesita
 * igual —las pantallas dicen en qué día es la cena— y dos constantes con la
 * misma zona es la forma en que este repo ya ha divergido varias veces.
 */
import reglas from '../../public/reglas.js'

const ZONA: string = reglas.ZONA

/** Las partes de una fecha en la zona del producto, no en la del servidor. */
function partes(iso: string): { dia: number; mes: number; ano: number } {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
  const [ano, mes, dia] = f.split('-').map(Number)
  return { dia, mes: mes - 1, ano }
}

// Los meses vienen de `reglas.js`, que los comparten web, servidor y app.
// Estaban escritos aqui y ahora tambien hacen falta dentro de `partesDe`
// —porque en Hermes el nombre del mes no llega del motor— asi que o vivian en
// un sitio o eran tres copias de doce palabras esperando a divergir.

/** «Agosto de 2026». */
export function mesYAno(iso: string | null): string {
  if (!iso) return '—'
  const { mes, ano } = partes(iso)
  return MESES[mes].charAt(0).toUpperCase() + MESES[mes].slice(1) + ' de ' + ano
}

/** «12 de agosto de 2026». */
export function diaCompleto(iso: string | null): string {
  if (!iso) return '—'
  const { dia, mes, ano } = partes(iso)
  return `${dia} de ${MESES[mes]} de ${ano}`
}

/**
 * «4 de enero de 1993» de una fecha SIN hora, que no es lo mismo.
 *
 * `diaCompleto` pasa el instante por la zona del producto, y eso es lo
 * correcto para una cena: un sábado a las ocho de la noche de Caracas es
 * domingo en UTC. Pero un NACIMIENTO no es un instante. `1992-02-06` es el
 * seis de febrero en todas partes, y `new Date()` lo coloca a medianoche
 * UTC: convertido a Caracas —cuatro horas atrás— sale el cinco.
 *
 * O sea que pasar un nacimiento por `diaCompleto` lo retrasa un día
 * SIEMPRE. Y el sitio donde esto se enseña es la ficha de operación, al
 * lado de la cédula que alguien está comparando: el único dato de esa
 * pantalla cuyo trabajo es cuadrar con otro, descuadrado por un formateo.
 *
 * Así que no se convierte nada: se parte la cadena. Una fecha sin hora no
 * tiene zona a la que convertirla.
 */
export function diaSuelto(fecha: string | null): string {
  if (!fecha) return '—'
  const m = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return fecha
  const [, ano, mes, dia] = m
  return `${Number(dia)} de ${MESES[Number(mes) - 1]} de ${ano}`
}

/**
 * «12 de agosto», sin año.
 *
 * Para lo que cae cerca: el año sobra y estorba cuando hablamos de algo que
 * pasa esta semana o dentro de tres meses.
 */
export function diaYMes(iso: string | null): string {
  if (!iso) return '—'
  const { dia, mes } = partes(iso)
  return `${dia} de ${MESES[mes]}`
}
