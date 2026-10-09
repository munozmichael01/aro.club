/**
 * La pregunta previa al permiso de las push (casilla C: solo del celular).
 * Una por momento; ver `src/avisos/maquina.ts`.
 */
export const pregunta = {
  alta: {
    titulo: (zona: string | null) => (zona ? `¿Te avisamos cuando abramos fecha en ${zona}?` : '¿Te avisamos cuando abramos fecha en tu zona?'),
    cuerpo: 'Solo lo importante: fechas nuevas en tus zonas, tu verificación y el día que se abra tu mesa.',
  },
  verificacion: {
    titulo: '¿Te avisamos en cuanto te aprueben?',
    cuerpo: 'Suele ser el mismo día. Y después, cuando abramos fecha en tus zonas.',
  },
  reserva: {
    titulo: '¿Te avisamos cuando se abra tu mesa?',
    cuerpo: 'Te llega cuando se revela: el sitio, la hora y los otros cinco.',
  },
  entrada: {
    titulo: '¿Te avisamos de lo importante?',
    cuerpo: 'Cuando se abra tu mesa, cuando abramos fecha en tus zonas y el día del encuentro. Nada más.',
  },
  si: 'Sí, avísame',
  no: 'Ahora no',
}
