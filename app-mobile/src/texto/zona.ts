import { reglas } from '../reglas'

/**
 * La zona horaria en la que habla el producto: la de la ciudad de la cena,
 * esté donde esté el celular (decisión del 27-09).
 *
 * Sale de `reglas.js` (`ZONA`), el mismo sitio que usa la web: cuando cada
 * fecha traiga su `zonaHoraria` (campo aditivo en `cities`), se cambia allí
 * una vez para las dos. Ninguna pantalla escribe «Caracas» ni un desfase.
 */
export const ZONA_PRODUCTO = reglas.ZONA

/** La zona de una fecha: la suya si viene, la del producto si no. */
export const zonaDe = (fecha: { zonaHoraria?: string | null } | null | undefined) =>
  fecha?.zonaHoraria || ZONA_PRODUCTO

/**
 * La ciudad del producto, por lo mismo y con la misma salida: hoy la única
 * abierta, mañana la de quien lee. `/api/proxima` todavía no dice de qué
 * ciudad es la fecha; cuando lo diga, esto deja de usarse.
 */
export const CIUDAD_PRODUCTO = { slug: 'caracas', nombre: 'Caracas' } as const
