/**
 * El juego de la mesa (entrega 18 de Design, «Aro Club - Juego de la mesa»).
 * El copy del juego es definitivo. Las preguntas, los nombres y bajadas de
 * las rondas y las cuatro reglas NO van aquí: salen de `AroReglas.JUEGO`, que
 * comparte la web.
 */
import { reglas } from '../reglas'

/** «media hora antes de la cena», o «cuando empieza la cena» si `abreMin` es 0. */
function cuandoAbre(min: number): string {
  if (min === 0) return 'cuando empieza la cena'
  if (min === -30) return 'media hora antes de la cena'
  return min < 0 ? `${-min} minutos antes de la cena` : `${min} minutos después de empezar`
}

export const tarjeta = {
  titulo: 'El juego de la mesa',
  abierto: 'Tres rondas de preguntas para romper el hielo. Quince minutos, y se guarda el teléfono.',
  abrir: 'Abrir el juego',
  cerrado: (hora: string) => `Se abre a las ${hora}, ${cuandoAbre(reglas.JUEGO.abreMin)}.`,
}

export const juego = {
  nombre: 'El juego de la mesa',
  salir: 'Salir del juego',
  reglas: { titulo: 'Antes de empezar', sub: 'Tres rondas · 15 minutos', empezar: 'Empezar', yaEmpezaron: '¿Ya empezaron?', ronda: (n: number) => `Ronda ${n}` },
  pregunta: {
    cabecera: (n: number, nombre: string) => `Ronda ${n} · ${nombre}`,
    posicion: (i: number, total: number) => `${i} de ${total}`,
    anterior: 'Pregunta anterior',
    siguiente: 'Siguiente',
  },
  cambio: {
    sub: (terminada: number) => `Ronda ${terminada} terminada`,
    eyebrow: (n: number, total: number) => `Ronda ${n} de ${total}`,
    lector: (n: number) => `¿Otra persona quiere leer? Que abra el juego en su teléfono y toque «Ronda ${n}». Verá las mismas preguntas.`,
    boton: (n: number) => `Empezar la ronda ${n}`,
  },
  final: { sub: 'Tres rondas', titulo: 'Hasta aquí el juego.', resto: 'Lo demás es suyo.', guardar: 'Ya pueden guardar el teléfono.', volver: 'Volver a Mi mesa' },
}
