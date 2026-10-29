/**
 * El juego por temáticas, calcado de la entrega tematicas de Design (29-10).
 * Las temáticas y sus preguntas no viven aquí: son de `AroReglas.JUEGO.tematicas`.
 */

export const etiqueta = 'EL JUEGO DE LA MESA'
export const elegir = {
  primera: { titulo: '¿De qué hablamos?', sub: 'Elijan una temática. En el orden que quieran, las veces que quieran.' },
  conAvance: { titulo: '¿Qué sigue?', sub: 'Pueden retomar, probar otra o repetir la que les gustó.' },
  preguntas: (n: number) => `${n} preguntas`,
  vanPor: (n: number) => `VAN POR LA ${n}`,
  jugada: 'JUGADA',
  pantalla: 'La pantalla queda encendida mientras juegan.',
}
export const portada = {
  empezar: 'Empezar',
  seguir: (en: number, de: number) => `Seguir · pregunta ${en} de ${de}`,
  deNuevo: 'Empezar de nuevo',
  otraVez: 'Jugar otra vez',
  elegirOtra: 'Elegir otra',
  vanPor: (en: number, de: number) => `VAN POR LA ${en} DE ${de}`,
  yaLaJugaron: 'YA LA JUGARON',
}
export const pregunta = {
  tematicas: 'Temáticas',
  deCuantas: (i: number, n: number) => `PREGUNTA ${i} DE ${n}`,
  siguiente: 'Siguiente',
  terminar: 'Terminar',
  pasa: 'Si a alguien no le provoca, pasa. No pasa nada.',
}
export const final = {
  sello: (nombre: string, n: number) => `${nombre.toUpperCase()} · ${n} DE ${n}`,
  titulo: '¿Otra, o hasta aquí?',
  texto: 'Pueden seguir con otra temática o guardar el teléfono y seguir hablando.',
  quedan: 'QUEDAN',
  todas: { titulo: 'Jugaron todas.', texto: 'Si la mesa quiere más, repitan la que más les gustó. Si no, a seguir hablando.', repetir: 'REPETIR UNA' },
  jugadaRepetir: 'Jugada · repetir',
  terminarJuego: 'Terminar el juego',
}
export const conversar = {
  titulo: 'Ahora, a conversar.',
  texto: 'Guarden el teléfono. El juego queda en Mi mesa por si se acaba el tema, y recuerda dónde iban.',
  volver: 'Volver a Mi mesa',
  verTematicas: 'Ver las temáticas',
}

/** La tarjeta en Mi mesa (M1 a M5 de la entrega). */
export const tarjeta = {
  resumen: (n: number) => `${n} temáticas · elijan por dónde empezar`,
  /** M2 · antes de la hora: «5 temáticas · se abre a las 7:00 p.m.». */
  resumenCerrado: (n: number, hora: string) => `${n} temáticas · se abre ${/^1:/.test(hora) ? 'a la' : 'a las'} ${hora}`,
  conAvance: (jugadas: number, aMedias: { nombre: string; en: number; de: number } | null) =>
    [jugadas ? `${jugadas} jugada${jugadas === 1 ? '' : 's'}` : '', aMedias ? `${aMedias.nombre} por la ${aMedias.en} de ${aMedias.de}` : ''].filter(Boolean).join(' · '),
  intro: 'Preguntas para cuando la mesa las necesite. Elijan la temática que quieran, en el orden que quieran.',
  preguntas: (n: number) => `${n} PREG.`,
  jugada: 'JUGADA',
  deCuantas: (en: number, de: number) => `${en} DE ${de}`,
  abrir: 'Abrir el juego',
  seguir: (nombre: string, en: number, de: number) => `Seguir · ${nombre}, ${en} de ${de}`,
  verTodas: 'Ver todas las temáticas',
}
