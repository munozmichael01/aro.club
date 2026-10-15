/**
 * El juego de la mesa (entrega 20 de Design, 15-10-2026; antes la 18). Las
 * preguntas, los nombres de las rondas y las cuatro reglas NO van aquí: salen
 * de `AroReglas.JUEGO`, que comparte la web.
 */

/** La tarjeta del juego en Mi mesa. */
export const tarjeta = {
  titulo: 'El juego de la mesa',
  resumen: '3 rondas · la primera va con la comida',
  intro: 'Una persona lee en voz alta, todos responden. Siempre se puede pasar.',
  /**
   * La línea «cuándo» y la bajada de cada ronda en la tarjeta. PROVISIONALES:
   * Michael tiene pendiente aprobar las bajadas (HANDOFF de la entrega 20).
   */
  rondas: [
    { cuando: (hora: string) => (hora ? `Mientras llega la comida · ${hora}` : 'Mientras llega la comida'), bajada: 'Ligera. Luego, a comer.' },
    { cuando: () => 'Si se acaba el tema', bajada: 'Si la mesa va bien sola, no hace falta.' },
    { cuando: () => 'Solo si a la mesa le provoca', bajada: 'Más personal. Cualquiera puede pasar.' },
  ],
  ir: 'Ir',
  hecha: 'Hecha',
  deTotal: (n: number, de: number) => `${n} de ${de}`,
  empezar: 'Empezar la ronda 1',
  seguir: (ronda: number, pregunta: number) => `Seguir · ronda ${ronda}, pregunta ${pregunta}`,
  reiniciar: 'Empezar de nuevo',
  irA: (n: number) => `Ir a la ronda ${n}`,
  /** Antes de la hora de la cena (Michael, 06-10 y otra vez el 15-10): nadie llega con las respuestas pensadas. */
  seAbre: (hora: string) => (hora ? `Se abre a las ${hora}, a la hora de la cena` : 'Se abre a la hora de la cena'),
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
