/**
 * La zona horaria en la que habla el producto: la de la ciudad de la cena,
 * esté donde esté el celular (decisión del 27-09).
 *
 * Mientras cada fecha no traiga su `zonaHoraria` desde el servidor (campo
 * aditivo en `cities`, pedido), la zona vive AQUÍ y en ningún otro sitio.
 * Ninguna pantalla escribe «Caracas» ni un desfase.
 */
export const ZONA_PRODUCTO = 'America/Caracas'

/** La zona de una fecha: la suya si viene, la del producto si no. */
export const zonaDe = (fecha: { zonaHoraria?: string | null } | null | undefined) =>
  fecha?.zonaHoraria || ZONA_PRODUCTO

/**
 * La ciudad del producto, por lo mismo y con la misma salida: hoy la única
 * abierta, mañana la de quien lee. `/api/proxima` todavía no dice de qué
 * ciudad es la fecha; cuando lo diga, esto deja de usarse.
 */
export const CIUDAD_PRODUCTO = { slug: 'caracas', nombre: 'Caracas' } as const
