/**
 * «Cómo funciona» en tres tarjetas (entrega como-funciona de Design, 29-10):
 * la versión corta del paso a paso. La hora de la revelación sale de la
 * fecha (`reglas.revelaDe`), nunca escrita: el brunch se revela la víspera.
 */

export const titulo = '¿Cómo funciona?'
export const fila = { titulo: '¿Cómo funciona?', bajada: 'Antes, durante y después, en tres tarjetas' }
export const filaMesa = { titulo: 'Cómo funciona', bajada: 'Antes, durante y después' }
export const siguiente = 'Siguiente'
export const entendido = 'Entendido'
export const pie = (miMesa: string) => `El paso a paso con sus horas aparece en ${miMesa} cuando se revela.`
export const cuentaDe = (i: number, n: number) => `${i} de ${n}`

export const primeraVez = { sello: (plan: string) => `TU PRIMERA ${plan.toUpperCase()} EN ARO`, titulo: 'Así va a ser tu noche.', tituloDia: 'Así va a ser tu plan.' }

export const etiquetas = { antes: 'ANTES', durante: 'DURANTE', despues: 'DESPUÉS' }

/** Las tres, con mesa (cena y brunch) o con grupo (los planes de movimiento). `cuando`: «El día de la cena, al mediodía». */
export const tarjetas = (esMesa: boolean, cuando: string) =>
  esMesa
    ? [
        { clave: 'antes', titulo: 'Llega y pregunta por la mesa de Aro', cuerpo: `${cuando}, te decimos dónde es y con quién vas. Se espera a todos un cuarto de hora.` },
        { clave: 'durante', titulo: 'Pidan, preséntense y dejen que fluya', cuerpo: 'Una vuelta rápida de nombres y a comer. Si se acaba el tema, el juego de la mesa está en la app.' },
        { clave: 'despues', titulo: 'Cada quien paga lo suyo, y si hay ganas, se sigue', cuerpo: 'Te sugerimos sitios cerca para seguir. Y si alguien te cayó bien, márcalo en la encuesta.' },
      ]
    : [
        { clave: 'antes', titulo: 'Llega al punto de encuentro', cuerpo: `${cuando}, te decimos dónde se reúne el grupo y con quién vas. Pregunta por el grupo de Aro.` },
        { clave: 'durante', titulo: 'Preséntense y a moverse', cuerpo: 'Una vuelta rápida de nombres y arrancan juntos. Cada quien a su ritmo.' },
        { clave: 'despues', titulo: 'Cada quien sigue su camino, o no', cuerpo: 'Si hay ganas, se sigue. Y si alguien te cayó bien, márcalo en la encuesta.' },
      ]
