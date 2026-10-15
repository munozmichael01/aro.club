/**
 * El juego de la mesa (entrega 20 de Design, 15-10-2026; antes la 18). Las
 * preguntas, los nombres de las rondas y las cuatro reglas NO van aquí: salen
 * de `AroReglas.JUEGO`, que comparte la web.
 */
import { reglas } from '../reglas'

/** La tarjeta del juego en Mi mesa. */
export const tarjeta = {
  titulo: 'El juego de la mesa',
  resumen: '3 rondas · la primera va con la comida',
  intro: 'Una persona lee en voz alta, todos responden. Siempre se puede pasar.',
  /** La línea «cuándo» de cada ronda (de `reglas.js`); la primera lleva la hora de «Para romper el hielo». */
  cuando: (ronda: number, hora: string) => {
    const c = reglas.JUEGO.rondas[ronda]?.cuando ?? ''
    return ronda === 0 && hora ? `${c} · ${hora}` : c
  },
  /** La bajada corta de la tarjeta (`enLaTarjeta`, PENDIENTE de Michael según Design). */
  bajada: (ronda: number) => reglas.JUEGO.rondas[ronda]?.enLaTarjeta ?? '',
  ir: 'Ir',
  hecha: 'Hecha',
  deTotal: (n: number, de: number) => `${n} de ${de}`,
  empezar: 'Empezar la ronda 1',
  seguir: (ronda: number, pregunta: number) => `Seguir · ronda ${ronda}, pregunta ${pregunta}`,
  reiniciar: 'Empezar de nuevo',
  irA: (n: number) => `Ir a la ronda ${n}`,
  /** 1a (entrega 21): antes de la hora de la cena. Nadie llega con las respuestas pensadas (Michael, 06-10 y 15-10). */
  resumenCerrado: '3 rondas · se abre a la hora de la cena',
  seAbre: (hora: string) => (hora ? `Se abre a las ${hora}, a la hora de la cena.` : 'Se abre a la hora de la cena.'),
  /** 1b y 1c: jugado entero o con «Terminar aquí». */
  jugado: (n: number, total: number) => `Jugado · ${n} de ${total} rondas`,
  hecho: 'Hecho',
  volverAJugar: 'Volver a jugar',
}

export const juego = {
  nombre: 'El juego de la mesa',
  salir: 'Salir del juego',
  reglas: { sub: 'Antes de empezar', titulo: 'Cómo se juega', empezar: 'Empezar la ronda 1', yaEmpezaron: '¿Ya empezaron?', ronda: (n: number) => `Ronda ${n}` },
  pregunta: {
    sub: (n: number, nombre: string) => `Ronda ${n} · ${nombre}`,
    posicion: (i: number, total: number) => `${i} de ${total}`,
    pista: 'Empieza quien leyó. Se puede pasar.',
    anterior: 'Pregunta anterior',
    siguiente: 'Siguiente',
  },
  lector: (n: number) => `¿Otra persona quiere leer? Que abra el juego en su teléfono y toque «Ronda ${n}». Verá las mismas preguntas.`,
  /** Fin de la ronda 1. «Ahora, a comer.» está PENDIENTE de Michael (HANDOFF de la entrega 20). */
  finRonda1: {
    sello: (total: number) => `Ronda 1 de ${total} · terminada`,
    titulo: 'Ahora, a comer.',
    texto: 'Guarden el teléfono y sigan con el paso a paso. La ronda 2 queda aquí para cuando se acabe el tema, o cuando quieran.',
    volver: 'Volver al paso a paso',
    seguir: 'Seguir con la ronda 2',
  },
  pausa: {
    sub: (terminada: number) => `Ronda ${terminada} terminada`,
    eyebrow: (n: number, total: number) => `Ronda ${n} de ${total}`,
    // La última ronda es opcional (Michael, 10-10): la mesa decide si sigue.
    aviso: 'Esta ronda es más personal. Solo si a la mesa le provoca.',
    seguir: (n: number) => `Seguir con la ronda ${n}`,
    terminar: 'Terminar aquí',
  },
  final: { sub: (rondas: number) => (rondas === 1 ? 'Una ronda' : rondas === 2 ? 'Dos rondas' : 'Tres rondas'), titulo: 'Hasta aquí el juego.', resto: 'Lo demás es suyo.', guardar: 'Ya pueden guardar el teléfono.', volver: 'Volver a Mi mesa' },
}
