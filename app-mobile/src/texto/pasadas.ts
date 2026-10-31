/**
 * Mi mesa · Próxima y Pasadas: lo que la entrega mi-mesa-pasadas (31-10) trae
 * y `AroReglas.CONTACTO` no. Lo de «Seguir en contacto» y las marcas de
 * Pasadas sale de allí, no de aquí.
 */

export const pestanas = { proxima: 'Próxima', pasadas: 'Pasadas' }
export const volver = 'Pasadas'
export const seguirEnContacto = 'SEGUIR EN CONTACTO'
export const conQuien = 'CON QUIÉN CENASTE'
export const verAgenda = 'Ver la agenda'

/** La encuesta dentro de la cena (C5) y en Próxima sin reserva (P3). */
export const encuesta = {
  titulo: '¿Cómo estuvo la cena?',
  tituloDia: (dia: string) => `¿Cómo estuvo el ${dia}?`,
  bajada: 'Son dos minutos. Al final puedes marcar a quién te gustaría volver a ver.',
  bajadaProxima: 'Son dos minutos. Lo que nos cuentas arma las próximas mesas.',
  boton: 'Contar cómo estuvo',
  ya: 'Ya contaste cómo estuvo',
  gracias: (cuando: string) => (cuando ? `${cuando}. Gracias.` : 'Gracias.'),
  ver: 'Ver',
}
