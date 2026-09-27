/**
 * La ciudad del producto, en UN sitio: hoy la única abierta, mañana la de
 * quien lee. Ninguna pantalla escribe «Caracas». `/api/proxima` todavía no
 * dice de qué ciudad es la fecha; cuando lo diga, esto deja de usarse. (La
 * zona horaria no vive aquí: es `reglas.ZONA`, la misma de la web.)
 */
export const CIUDAD_PRODUCTO = { slug: 'caracas', nombre: 'Caracas' } as const
