import { router, useLocalSearchParams } from 'expo-router'

import type { Tematica } from '../tematicas/maquina'
import * as M from '../tematicas/maquina'
import { JuegoTematicas, type Vista } from '../tematicas/Tematicas'
import { soloDesarrollo } from '../util/soloDesarrollo'

/**
 * El juego por temáticas con el mazo DE EJEMPLO de Design (tematicas.js de la
 * entrega): /catalogo-tematicas?estado=elegir|avance|portada|pregunta|larga|final|todas|conversar
 * Catálogo de desarrollo: el mazo de verdad irá en reglas.js cuando Michael lo apruebe.
 */
const MAZO: Tematica[] = [
  { clave: 'rapido', nombre: 'Rápido y ligero', linea: 'Para arrancar sin pensar mucho.', preguntas: ['¿Arepa de qué?', '¿Playa o montaña, y cuál?', '¿Qué es lo primero que abres en el teléfono al despertar?', '¿Cómo es tu domingo perfecto?', '¿Qué canción te sabes completa sin querer?'] },
  { clave: 'mueve', nombre: 'Lo que te mueve', linea: 'Gustos, manías y lo que te importa.', preguntas: ['¿Qué te hace perder la noción del tiempo?', '¿Qué cosa pequeña te arregla el día?', '¿Qué aprendiste de grande que te hubiera gustado saber antes?', '¿A quién le pides consejo y por qué?', '¿Qué no negocias en una amistad?'] },
  { clave: 'historias', nombre: 'Historias', linea: 'Anécdotas que valen la pena contar.', preguntas: ['¿Cuál es el viaje que más recuerdas?', '¿Cuál fue tu primer trabajo?', '¿Una vez que dijiste que sí sin pensarlo?', '¿Lo más raro que has comido?', '¿Qué te pasó que nadie te cree?'] },
  { clave: 'ysi', nombre: '¿Y si…?', linea: 'Hipotéticos para imaginar en voz alta.', preguntas: ['Si pudieras vivir un año en otra ciudad, ¿cuál?', 'Si te regalaran una hora extra al día, ¿qué harías con ella?', 'Si mañana abrieras un negocio con alguien de esta mesa, ¿de qué sería y con quién lo harías?', 'Si pudieras cenar con cualquier persona, viva o no, ¿con quién?', 'Si dieras una charla de cinco minutos, ¿de qué hablarías?'] },
]

function Pantalla() {
  const { estado = 'elegir' } = useLocalSearchParams<{ estado?: string }>()
  let m = M.vacia()
  if (estado !== 'elegir') m = M.avanzar(M.avanzar(m, MAZO[0], 5), MAZO[2], 2)
  if (estado === 'todas') m = MAZO.reduce((x, t) => M.avanzar(x, t, t.preguntas.length), M.vacia())
  const vista: Vista =
    estado === 'portada' ? { en: 'portada', i: 2 } : estado === 'pregunta' ? { en: 'pregunta', i: 1, k: 1 } : estado === 'larga' ? { en: 'pregunta', i: 3, k: 2 } : estado === 'final' ? { en: 'final', i: 2 } : estado === 'todas' ? { en: 'final', i: 3 } : estado === 'conversar' ? { en: 'conversar' } : { en: 'elegir' }
  return <JuegoTematicas key={estado} mesaId="catalogo" tematicas={MAZO} inicial={m} vista={vista} alSalir={() => router.push('/catalogo')} />
}

export default soloDesarrollo(Pantalla)
