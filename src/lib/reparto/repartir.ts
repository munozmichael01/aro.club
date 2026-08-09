import 'server-only'

/**
 * El reparto en mesas.
 *
 * El usuario se apunta a una FECHA, no a una mesa. Al cerrar la fecha se
 * reparte a todos los apuntados en mesas de seis y esa asignación se
 * persiste. F10 la lee; nunca la calcula al abrirse.
 *
 * Dos capas, y no se mezclan:
 *
 *   - Restricciones DURAS: si una se rompe, la mesa no existe. No hay
 *     puntuación que compense sentar a alguien con su jefe.
 *   - PUNTUACIÓN: entre las mesas legales, cuál es mejor. Los pesos viven
 *     en la corrida, no en el código, para poder auditarlos después.
 */

export type Persona = {
  profileId: string
  bookingId: string
  nombre: string
  edad: number | null
  genero: string | null
  arraigo: string | null
  sector: string | null
  /** Empresa ya normalizada y resuelta contra los alias confirmados. */
  empresa: string | null
  energia: string | null
  tramoGasto: number | null
  intereses: string[]
  temas: string[]
  idiomas: string[]
  /** Zonas que acepta PARA ESA FECHA, ya cruzadas con las que abrimos. */
  zonas: string[]
  /** Restricciones alimentarias. El restaurante tiene que poder con todas. */
  dietas: string[]
  /** Perfiles con los que no puede coincidir: exclusiones o ya se vieron. */
  vetados: Set<string>
}

export type Pesos = {
  cohesion: number
  sector: number
  arraigo: number
  energia: number
  novedad: number
}

export const PESOS: Pesos = {
  cohesion: 0.3,
  sector: 0.25,
  arraigo: 0.2,
  energia: 0.15,
  novedad: 0.1,
}

/**
 * Trabajar por cuenta propia no es una empresa: dos freelance no son
 * compañeros de trabajo (HANDOFF-4 §4.1).
 */
const SIN_EMPRESA = /^(freelance|estudio propio|oficina propia|por mi cuenta|independiente)$/i

function empresaDe(p: Persona): string | null {
  if (!p.empresa) return null
  return SIN_EMPRESA.test(p.empresa.trim()) ? null : p.empresa.trim().toLowerCase()
}

// ---------------------------------------------------------------------
// Restricciones duras
// ---------------------------------------------------------------------

export type Rotura = { regla: string; detalle: string }

export function roturas(mesa: Persona[]): Rotura[] {
  const fallos: Rotura[] = []

  const edades = mesa.map((p) => p.edad).filter((e): e is number => e != null)
  if (edades.length > 1) {
    const spread = Math.max(...edades) - Math.min(...edades)
    if (spread > 10) {
      const joven = mesa.find((p) => p.edad === Math.min(...edades))
      const mayor = mesa.find((p) => p.edad === Math.max(...edades))
      fallos.push({
        regla: 'edad',
        detalle: `${spread} años entre ${joven?.nombre} (${joven?.edad}) y ${mayor?.nombre} (${mayor?.edad})`,
      })
    }
  }

  const mujeres = mesa.filter((p) => p.genero === 'mujer').length
  const hombres = mesa.filter((p) => p.genero === 'hombre').length
  if (Math.abs(mujeres - hombres) > 2) {
    fallos.push({ regla: 'genero', detalle: `${mujeres} mujeres y ${hombres} hombres` })
  }

  const empresas = mesa.map(empresaDe).filter((e): e is string => e != null)
  const repetida = empresas.find((e, i) => empresas.indexOf(e) !== i)
  if (repetida) {
    // Con nombres. "dos de banesco" obligaba a mirar uno por uno quiénes
    // eran, justo cuando hay que decidir si se publica o no.
    const quienes = mesa.filter((p) => empresaDe(p) === repetida).map((p) => p.nombre)
    fallos.push({ regla: 'empresa', detalle: `${quienes.join(' y ')}, los dos en ${repetida}` })
  }

  // TODAS las parejas vetadas, no la primera. Cortar en la primera hacía
  // que al arreglar una apareciera otra que ya estaba ahí: desde el panel
  // parecía que cada cambio creaba un problema nuevo.
  const vistos = new Set<string>()
  for (let i = 0; i < mesa.length; i++) {
    for (let j = i + 1; j < mesa.length; j++) {
      const a = mesa[i]
      const b = mesa[j]
      if (!a.vetados.has(b.profileId) && !b.vetados.has(a.profileId)) continue
      const clave = [a.profileId, b.profileId].sort().join(':')
      if (vistos.has(clave)) continue
      vistos.add(clave)
      fallos.push({ regla: 'veto', detalle: `${a.nombre} y ${b.nombre}` })
    }
  }

  const tramos = mesa.map((p) => p.tramoGasto).filter((t): t is number => t != null)
  if (tramos.length > 1 && Math.max(...tramos) - Math.min(...tramos) > 1) {
    // Un tier 1 con un tier 3 garantiza mal rato cuando llega la cuenta.
    const barato = mesa.find((p) => p.tramoGasto === Math.min(...tramos))
    const caro = mesa.find((p) => p.tramoGasto === Math.max(...tramos))
    fallos.push({
      regla: 'gasto',
      detalle: `${barato?.nombre} y ${caro?.nombre} están a dos tramos de distancia`,
    })
  }

  const deVisita = mesa.filter((p) => p.arraigo === 'visita')
  if (deVisita.length > 2) {
    fallos.push({ regla: 'visita', detalle: deVisita.map((p) => p.nombre).join(', ') })
  }

  // Zona: la misma operacion que el idioma. Una mesa solo existe si hay un
  // sitio al que los seis irian. No se reparte por zona en pools separados
  // —eso fragmenta y con poca gente no se llena ninguna mesa—: la zona es
  // una restriccion sobre quien puede sentarse junto.
  const zonaComun = zonasDe(mesa)
  if (zonaComun.length === 0) {
    fallos.push({ regla: 'zona', detalle: 'sin zona en comun' })
  }

  const comun = mesa
    .map((p) => new Set(p.idiomas))
    .reduce<Set<string> | null>((acc, s) => {
      if (!acc) return s
      return new Set([...acc].filter((x) => s.has(x)))
    }, null)
  if (comun && comun.size === 0) {
    fallos.push({
      regla: 'idioma',
      detalle: mesa.map((p) => `${p.nombre}: ${p.idiomas.join('/')}`).join(' · '),
    })
  }

  return fallos
}

/**
 * Las zonas donde esta mesa podria cenar: las que aceptan LOS SEIS.
 * Ordenadas para que el reparto sea estable ante el mismo pool.
 */
export function zonasDe(mesa: Persona[]): string[] {
  if (!mesa.length) return []
  const comun = mesa
    .map((p) => new Set(p.zonas ?? []))
    .reduce<Set<string> | null>((acc, s) => {
      if (!acc) return s
      return new Set([...acc].filter((x) => s.has(x)))
    }, null)
  return [...(comun ?? new Set<string>())].sort()
}

export const esLegal = (mesa: Persona[]) => roturas(mesa).length === 0

// ---------------------------------------------------------------------
// Puntuación
// ---------------------------------------------------------------------

export function desglose(mesa: Persona[]): Record<keyof Pesos, number> {
  const n = mesa.length || 1

  // Cohesión: cuánta gente comparte al menos dos intereses con la mesa.
  const conCompania = mesa.filter((p) => {
    const otros = mesa.filter((o) => o.profileId !== p.profileId)
    const compartidos = p.intereses.filter((i) => otros.some((o) => o.intereses.includes(i)))
    const temasCompartidos = p.temas.filter((t) => otros.some((o) => o.temas.includes(t)))
    return compartidos.length + temasCompartidos.length >= 2
  }).length
  const cohesion = conCompania / n

  // Diversidad de sector: penaliza a partir de dos del mismo.
  const porSector = new Map<string, number>()
  for (const p of mesa) if (p.sector) porSector.set(p.sector, (porSector.get(p.sector) ?? 0) + 1)
  const exceso = [...porSector.values()].reduce((t, c) => t + Math.max(0, c - 2), 0)
  const sector = Math.max(0, 1 - exceso / n)

  // Mezcla de arraigo: al menos un returnee y dos que se quedaron.
  const volvio = mesa.filter((p) => p.arraigo === 'volvio').length
  const seQuedo = mesa.filter((p) => p.arraigo === 'se-quedo').length
  const arraigo = (Math.min(volvio, 1) + Math.min(seQuedo, 2) / 2) / 2

  // Balance de energía: dos o tres que llevan la conversación.
  const llevan = mesa.filter((p) => p.energia === 'lleva').length
  const energia = llevan >= 2 && llevan <= 3 ? 1 : Math.max(0, 1 - Math.abs(llevan - 2.5) / 3)

  // Novedad de red: penaliza mesas donde ya se conocían.
  const pares = (n * (n - 1)) / 2 || 1
  let conocidos = 0
  for (let i = 0; i < mesa.length; i++) {
    for (let j = i + 1; j < mesa.length; j++) {
      if (mesa[i].vetados.has(mesa[j].profileId)) conocidos++
    }
  }
  const novedad = 1 - conocidos / pares

  return { cohesion, sector, arraigo, energia, novedad }
}

/**
 * Lo que la mesa comparte, en claro.
 *
 * La puntuación dice "0.835" y las roturas dicen qué está mal, pero para
 * decidir si esta mesa se publica hace falta lo tercero: en qué se parecen.
 * Sin eso, publicar es firmar a ciegas lo que decidió el algoritmo.
 */
export type Resumen = {
  zonas: string[]
  temas: string[]
  intereses: string[]
  idiomas: string[]
  tramoGasto: { min: number; max: number } | null
  edades: { min: number; max: number } | null
  generos: { mujeres: number; hombres: number; otros: number }
  dietas: string[]
  sectores: string[]
  arraigos: string[]
  energias: { lleva: number; depende: number; escucha: number }
}

/** Lo que TODOS comparten, no lo que aparece alguna vez. */
function interseccion(listas: string[][]): string[] {
  if (!listas.length) return []
  return [...listas.reduce<Set<string>>(
    (acc, l, i) => (i === 0 ? new Set(l) : new Set([...acc].filter((x) => l.includes(x)))),
    new Set<string>(),
  )].sort()
}

export function resumen(mesa: Persona[]): Resumen {
  const edades = mesa.map((p) => p.edad).filter((e): e is number => e != null)
  const tramos = mesa.map((p) => p.tramoGasto).filter((t): t is number => t != null)

  return {
    zonas: zonasDe(mesa),
    temas: interseccion(mesa.map((p) => p.temas)),
    intereses: interseccion(mesa.map((p) => p.intereses)),
    idiomas: interseccion(mesa.map((p) => p.idiomas)),
    tramoGasto: tramos.length ? { min: Math.min(...tramos), max: Math.max(...tramos) } : null,
    edades: edades.length ? { min: Math.min(...edades), max: Math.max(...edades) } : null,
    generos: {
      mujeres: mesa.filter((p) => p.genero === 'mujer').length,
      hombres: mesa.filter((p) => p.genero === 'hombre').length,
      otros: mesa.filter((p) => p.genero !== 'mujer' && p.genero !== 'hombre').length,
    },
    // Las dietas NO se intersecan: aquí importa la union, porque el
    // restaurante tiene que poder darle de comer a los seis.
    dietas: [...new Set(mesa.flatMap((p) => p.dietas ?? []))].filter((d) => d !== 'ninguna').sort(),
    sectores: [...new Set(mesa.map((p) => p.sector).filter((x): x is string => !!x))].sort(),
    arraigos: [...new Set(mesa.map((p) => p.arraigo).filter((x): x is string => !!x))].sort(),
    energias: {
      lleva: mesa.filter((p) => p.energia === 'lleva').length,
      depende: mesa.filter((p) => p.energia === 'depende').length,
      escucha: mesa.filter((p) => p.energia === 'escucha').length,
    },
  }
}

export function puntuar(mesa: Persona[], pesos: Pesos = PESOS): number {
  const d = desglose(mesa)
  return (
    d.cohesion * pesos.cohesion +
    d.sector * pesos.sector +
    d.arraigo * pesos.arraigo +
    d.energia * pesos.energia +
    d.novedad * pesos.novedad
  )
}

// ---------------------------------------------------------------------
// El reparto
// ---------------------------------------------------------------------

export type Resultado = {
  mesas: Persona[][]
  espera: Persona[]
  puntuaciones: number[]
  media: number
}

/**
 * Construye por afinidad y después mejora con intercambios.
 *
 * No busca el óptimo global —con 36 personas son billones de combinaciones—
 * sino una solución legal y buena en tiempo predecible. Lo que sí garantiza
 * es que ninguna mesa devuelta rompe una restricción dura.
 */
export function repartir(pool: Persona[], porMesa = 6, pesos: Pesos = PESOS): Resultado {
  const cuantas = Math.floor(pool.length / porMesa)
  if (cuantas === 0) return { mesas: [], espera: [...pool], puntuaciones: [], media: 0 }

  // Semilla por edad, y el id como desempate para que sea estable: mismo
  // pool, mismo reparto. Ordenar por edad importa porque el spread de 10
  // años es la restricción que más difícil es arreglar después: sembrar al
  // azar mezcla generaciones y luego ningún intercambio lo deshace.
  // Por zonas primero y luego por edad. La edad sigue mandando dentro de
  // cada grupo —el spread de diez años es lo mas dificil de arreglar
  // despues— pero quien solo acepta una zona entra antes que quien acepta
  // tres, porque tiene menos huecos donde caber.
  const orden = [...pool].sort(
    (a, b) =>
      a.zonas.length - b.zonas.length ||
      (a.edad ?? 999) - (b.edad ?? 999) ||
      a.profileId.localeCompare(b.profileId),
  )

  const mesas: Persona[][] = Array.from({ length: cuantas }, () => [])
  const libres = [...orden]

  // Reparto por afinidad: cada mesa se siembra y crece con quien más suma
  // sin romper nada.
  for (let m = 0; m < cuantas; m++) {
    mesas[m].push(libres.shift() as Persona)
    while (mesas[m].length < porMesa && libres.length) {
      let mejor = -1
      let mejorPunto = -Infinity
      let mejorFlex = Infinity
      for (let i = 0; i < libres.length; i++) {
        const tentativa = [...mesas[m], libres[i]]
        if (!esLegal(tentativa)) continue
        // Primero quien tiene MENOS zonas donde puede ir.
        //
        // Sin esto, la primera mesa se llevaba a los flexibles porque
        // puntuaban bien, y los que solo aceptan una zona acababan juntos
        // sin poder compartir ninguna. Con 6 de Las Mercedes, 3 de El
        // Rosal y 3 que aceptan las dos hay solucion evidente, y el reparto
        // no la encontraba: dejaba una mesa sin sitio donde cenar.
        //
        // Quien puede ir a todas partes cabe en cualquier hueco; quien solo
        // puede ir a uno hay que sentarlo mientras ese hueco existe.
        const flex = libres[i].zonas.length
        const p = puntuar(tentativa, pesos)
        if (flex < mejorFlex || (flex === mejorFlex && p > mejorPunto)) {
          mejorFlex = flex
          mejorPunto = p
          mejor = i
        }
      }
      // Si nadie cabe sin romper, se coge a QUIEN MENOS ROMPE, no al
      // primero de la lista. Coger al primero metia a alguien de otra zona
      // en una mesa que solo necesitaba estirar la edad, y eso deja la mesa
      // sin sitio donde cenar: una rotura barata se cambiaba por una que no
      // tiene arreglo.
      if (mejor < 0) {
        let menos = Infinity
        let punto = -Infinity
        for (let i = 0; i < libres.length; i++) {
          const tentativa = [...mesas[m], libres[i]]
          const n = roturas(tentativa).length
          const p = puntuar(tentativa, pesos)
          if (n < menos || (n === menos && p > punto)) {
            menos = n
            punto = p
            mejor = i
          }
        }
      }
      mesas[m].push(libres.splice(Math.max(0, mejor), 1)[0])
    }
  }

  // Mejora por intercambio, con dos objetivos en orden: primero bajar el
  // número de roturas, y solo con las mismas roturas, subir la puntuación.
  //
  // El orden importa. Exigir que las dos mesas queden legales de golpe deja
  // atascado cualquier reparto que empiece roto: casi nunca hay un único
  // intercambio que arregle todo a la vez, y sin poder bajar de tres
  // roturas a dos, nunca se llega a cero.
  const mejorQue = (
    rotasNuevas: number,
    puntosNuevos: number,
    rotasViejas: number,
    puntosViejos: number,
  ) =>
    rotasNuevas < rotasViejas ||
    (rotasNuevas === rotasViejas && puntosNuevos > puntosViejos + 1e-9)

  for (let vuelta = 0; vuelta < 60; vuelta++) {
    let mejoro = false
    for (let a = 0; a < mesas.length; a++) {
      for (let b = a + 1; b < mesas.length; b++) {
        for (let i = 0; i < mesas[a].length; i++) {
          for (let j = 0; j < mesas[b].length; j++) {
            const rotasAntes = roturas(mesas[a]).length + roturas(mesas[b]).length
            const puntosAntes = puntuar(mesas[a], pesos) + puntuar(mesas[b], pesos)

            const na = [...mesas[a]]
            const nb = [...mesas[b]]
            ;[na[i], nb[j]] = [nb[j], na[i]]

            const rotasDespues = roturas(na).length + roturas(nb).length
            const puntosDespues = puntuar(na, pesos) + puntuar(nb, pesos)

            if (mejorQue(rotasDespues, puntosDespues, rotasAntes, puntosAntes)) {
              mesas[a] = na
              mesas[b] = nb
              mejoro = true
            }
          }
        }
      }
    }
    if (!mejoro) break
  }

  const puntuaciones = mesas.map((m) => puntuar(m, pesos))
  return {
    mesas,
    espera: libres,
    puntuaciones,
    media: puntuaciones.reduce((t, p) => t + p, 0) / (puntuaciones.length || 1),
  }
}
