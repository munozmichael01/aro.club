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
  /**
   * Y como la escribió ella. La normalizada es para comparar —`banesco`— y
   * enseñarla en el panel deja una ficha en minúsculas que no es el nombre
   * de nadie. Comparar y mostrar no son el mismo dato.
   */
  empresaTexto?: string | null
  energia: string | null
  /**
   * Si bebe y cuanto: `nada`, `una`, `algunas`, `varias`. Nulo es NO
   * CONTESTADO, que no es lo mismo que `nada`.
   */
  copas: string | null
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
  /**
   * Con quién ya cenó ALGUNA vez, sin ventana de tiempo. No es lo mismo que
   * `vetados`: el veto son tres meses y es regla dura, así que en una mesa
   * que cuadra nunca hay vetados y el término de novedad valía 1 siempre.
   * Un diez por ciento de la puntuación que no medía nada.
   */
  conocidos: Set<string>
}

export type Pesos = {
  cohesion: number
  sector: number
  arraigo: number
  energia: number
  novedad: number
  bebida: number
}

/**
 * EL ARRAIGO VUELVE A PUNTUAR, pero midiendo otra cosa.
 *
 * Estuvo en 0.2 con una teoria —que el que volvio y el que se quedo tienen
 * de que hablar— que nunca comprobamos, y por eso se bajo a cero. Michael,
 * 18-10: «por que este no suma si al final es un punto en comun».
 *
 * Tiene razon, y lo que estaba mal no era el peso sino la cuenta. La vieja
 * premiaba una COMBINACION concreta (un `volvio` y dos `se-quedo`), que es
 * una receta inventada. La de ahora mide lo que el dice: cuanta gente de la
 * mesa comparte su situacion con alguien mas. Dos que acaban de llegar a
 * Caracas, o dos que volvieron despues de anos fuera, tienen una
 * conversacion que no hay que provocar.
 *
 * El 0.1 sale de la cohesion, que es el termino que hoy no decide nada: da
 * 1,00 en todas las mesas porque basta compartir dos intereses y con el
 * catalogo actual eso lo cumple todo el mundo. Sigue siendo el que mas pesa.
 */
/**
 * Y la bebida PUNTUA, no es regla dura.
 *
 * Michael, 18-10: «esto debe tomarse en cuenta en el emparejamiento
 * tambien», y eligio puntuacion sobre regla dura. Es la decision prudente:
 * con la gente que se apunta hoy, cada regla dura nueva es una mesa menos,
 * y quedarse sin mesa es peor que una mesa donde uno toma agua.
 *
 * Su 0.1 sale otra vez de la cohesion, y por el mismo motivo: da 1,00 en
 * todas las mesas, asi que bajarla hoy no cambia ni un reparto. Cuando la
 * cohesion se mida por parejas habra que repartir los pesos de nuevo, y eso
 * se decide con Michael, no aqui.
 */
export const PESOS: Pesos = {
  cohesion: 0.2,
  sector: 0.3,
  arraigo: 0.1,
  energia: 0.2,
  novedad: 0.1,
  bebida: 0.1,
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

  /**
   * Y NADIE sentado al lado de alguien con quien no comparte nada.
   *
   * Michael, 17-10, viendo que la cohesion daba 1,00 en las cinco mesas:
   * «y da una regla dura que hoy no existe: ninguna pareja sin nada en
   * comun. Hazlo».
   *
   * La puntuacion mira la mesa entera y por eso no ve esto: una mesa donde
   * cinco se entienden y el sexto no tiene de que hablar con nadie puntua
   * alto, y esa persona pasa tres horas asintiendo. Lo que arruina una cena
   * no es la media, es el que sobra.
   *
   * «Nada» es nada de nada: ni un interes ni un tema. Dos personas que
   * comparten uno ya tienen por donde empezar.
   */
  const sinNada: string[] = []
  for (let i = 0; i < mesa.length; i++) {
    for (let j = i + 1; j < mesa.length; j++) {
      const a = mesa[i]
      const b = mesa[j]
      const comun =
        a.intereses.filter((x) => b.intereses.includes(x)).length +
        a.temas.filter((x) => b.temas.includes(x)).length
      if (comun === 0) sinNada.push(`${a.nombre} y ${b.nombre}`)
    }
  }
  if (sinNada.length) {
    fallos.push({
      regla: 'sin-nada-en-comun',
      detalle: sinNada.length === 1
        ? `${sinNada[0]} no comparten ni un interes ni un tema`
        : `${sinNada.length} parejas sin nada en comun: ${sinNada.join(' · ')}`,
    })
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

/**
 * Las reglas evaluadas TODAS, cumplidas y rotas, con su texto.
 *
 * `roturas` solo devuelve lo que falla, que es lo que necesita el reparto.
 * Pero el panel enseña las ocho a la vez —en verde las que cuadran— y con
 * solo las rotas tendría que deducir las buenas: volver a contar géneros,
 * edades y empresas en el navegador. Eso es una segunda implementación de
 * las reglas, y el día que discrepe de esta, la pantalla diría que una mesa
 * está bien mientras el servidor se niega a publicarla.
 *
 * Así que se evalúan aquí una sola vez y se mandan hechas.
 */
export type Regla = { regla: string; ok: boolean; texto: string }

export function evaluacion(
  mesa: Persona[],
  /** El slug de la zona donde está puesta la mesa: con eso se comprueba. */
  zonaDeLaMesa?: string | null,
  /** Y su nombre, que es lo que se lee. Sin él se enseña el slug. */
  nombreDeLaZona?: string | null,
): Regla[] {
  const rotas = new Map(roturas(mesa).map((r) => [r.regla, r.detalle]))
  const di = (clave: string, bien: string): Regla => ({
    regla: clave,
    ok: !rotas.has(clave),
    texto: rotas.get(clave) ?? bien,
  })

  const mujeres = mesa.filter((p) => p.genero === 'mujer').length
  const hombres = mesa.filter((p) => p.genero === 'hombre').length

  const edades = mesa.map((p) => p.edad).filter((e): e is number => e != null)
  const rango = edades.length
    ? `${Math.min(...edades)}–${Math.max(...edades)} años`
    : 'Sin edades'

  // La zona se mira contra DÓNDE está puesta la mesa, no solo entre ellos.
  // Que los seis compartan Las Mercedes no dice nada si la mesa está en Los
  // Palos Grandes: seis personas que no pueden llegar.
  const comunes = zonasDe(mesa)
  const zonaOk = zonaDeLaMesa ? comunes.includes(zonaDeLaMesa) : comunes.length > 0
  const comoSeLee = nombreDeLaZona ?? zonaDeLaMesa
  const textoZona = zonaDeLaMesa
    ? zonaOk
      ? `Todos aceptan ${comoSeLee}`
      : comunes.length
        ? `Nadie acepta ${comoSeLee}`
        : 'Sin zona para los seis'
    : comunes.length
      ? 'Zona en común'
      : 'Sin zona para los seis'

  return [
    di('genero', `Balance ${mujeres} y ${hombres}`),
    di('edad', rango),
    di('empresa', 'Sin empresa repetida'),
    di('veto', 'Nadie repetido'),
    // La de hoy. Faltaba aquí: el servidor se negaba a publicar la mesa y el
    // panel no tenía chip que ponerse en rojo, así que la razón solo salía en
    // la línea de «rompe N reglas». Una regla que bloquea y no se ve es una
    // regla que operación descubre cuando ya está intentando publicar.
    di('sin-nada-en-comun', 'Todos con alguien de qué hablar'),
    di('gasto', 'Gasto compatible'),
    di('idioma', 'Idioma común'),
    { regla: 'zona', ok: zonaOk, texto: textoZona },
  ]
}

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

  // Arraigo: cuánta gente comparte su situación con al menos otra persona.
  //
  // No premia ninguna combinación en concreto —eso era lo que hacía antes, y
  // era una receta inventada—: premia que nadie sea el único que llegó hace
  // dos meses en una mesa de seis que se conoce la ciudad de memoria. Quien
  // no contestó no cuenta ni a favor ni en contra.
  const cuantosPorArraigo = new Map<string, number>()
  for (const p of mesa) {
    if (p.arraigo) cuantosPorArraigo.set(p.arraigo, (cuantosPorArraigo.get(p.arraigo) ?? 0) + 1)
  }
  const acompanados = mesa.filter(
    (p) => p.arraigo && (cuantosPorArraigo.get(p.arraigo) ?? 0) > 1,
  ).length
  const arraigo = acompanados / n

  // Balance de energía: dos o tres que llevan la conversación.
  const llevan = mesa.filter((p) => p.energia === 'lleva').length
  const energia = llevan >= 2 && llevan <= 3 ? 1 : Math.max(0, 1 - Math.abs(llevan - 2.5) / 3)

  // Novedad de red: penaliza mesas donde ya se conocían.
  const pares = (n * (n - 1)) / 2 || 1
  let conocidos = 0
  for (let i = 0; i < mesa.length; i++) {
    for (let j = i + 1; j < mesa.length; j++) {
      if (mesa[i].conocidos.has(mesa[j].profileId)) conocidos++
    }
  }
  const novedad = 1 - conocidos / pares

  /**
   * Bebida: cuanta gente de la mesa bebe PARECIDO a alguien mas.
   *
   * «Parecido» es un escalon de distancia, no identico: quien toma una copa
   * y quien toma dos o tres estan en la misma cena. El que queda fuera es el
   * extremo solo, y es el caso que esto evita: el unico que no toma en una
   * mesa que pide botella, o el reves.
   *
   * SIN CONTESTAR NO CUENTA, ni a favor ni en contra: no esta en el de
   * arriba ni en el de abajo. Y si no contesto casi nadie, el termino vale 1
   * para todas las mesas, que es lo mismo que no existir: un numero igual en
   * todas no cambia cual gana. Hoy es asi en todas, porque las preguntas son
   * de hoy.
   */
  const NIVEL: Record<string, number> = { nada: 0, una: 1, algunas: 2, varias: 3 }
  const conNivel = mesa
    .map((p) => (p.copas ? NIVEL[p.copas] : undefined))
    .filter((x): x is number => x != null)
  const acompanadosBebiendo = conNivel.filter(
    (x, i) => conNivel.some((y, j) => i !== j && Math.abs(x - y) <= 1),
  ).length
  const bebida = conNivel.length < 2 ? 1 : acompanadosBebiendo / conNivel.length

  return { cohesion, sector, arraigo, energia, novedad, bebida }
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
    d.novedad * pesos.novedad +
    d.bebida * pesos.bebida
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
export function repartir(
  pool: Persona[],
  porMesa = 6,
  pesos: Pesos = PESOS,
  /**
   * Dejar que la ÚLTIMA mesa salga corta.
   *
   * Por defecto no: una mesa es de seis, y sentar a cuatro porque no llegaron
   * más convierte la promesa del club en «los que haya». Quien sobra va a la
   * espera y se le dice.
   *
   * Pero con cinco apuntados el reparto devolvía CERO mesas y la pantalla se
   * quedaba sin salida: ni publicar, ni forzar, ni nada que decidir. Y la
   * decisión existe —el producto ya acepta una mesa de cinco cuando alguien
   * se baja de una publicada—, solo que no se podía tomar antes.
   *
   * Así que es una decisión explícita de quien reparte, no un relajo del
   * algoritmo: se pide por la ruta, llega hasta aquí, y la mesa corta sale
   * marcada para que el panel la enseñe por lo que es.
   */
  permitirCorta = false,
): Resultado {
  // Quien no acepta NINGUNA de las zonas abiertas no se puede sentar en
  // ningun sitio, y ordenar por "menos zonas primero" lo hacia justo lo
  // contrario: entraba el primero a sembrar mesas —cero es el minimo— y
  // arrastraba la mesa entera a una rotura de zona que no tiene arreglo.
  // Va a espera, que es lo que es: alguien para quien no abrimos su zona.
  const sentables = pool.filter((p) => p.zonas.length > 0)
  const sinZona = pool.filter((p) => p.zonas.length === 0)

  // Tantas mesas como grupos completos haya. No hay tope por arriba: si se
  // apuntan cuarenta salen seis mesas, y lo que hay que conseguir es sitio
  // para seis, no sentar a menos gente.
  const cuantas = Math.floor(sentables.length / porMesa)

  /**
   * Con menos de una mesa entera, o no hay nada que repartir, o hay una
   * decisión que tomar.
   *
   * Dos personas no son una cena: el mínimo es tres, que es cuando una mesa
   * deja de ser una cita y empieza a ser un grupo. Por debajo, a la espera
   * aunque se pida la corta.
   */
  const MINIMO_CORTA = 3
  if (cuantas === 0) {
    if (!permitirCorta || sentables.length < MINIMO_CORTA) {
      return { mesas: [], espera: [...pool], puntuaciones: [], media: 0 }
    }
    // Una sola mesa con los que hay. No se reordena ni se optimiza: con
    // menos de seis no hay nada que intercambiar.
    const unica = [...sentables]
    const puntos = [puntuar(unica, pesos)]
    return { mesas: [unica], espera: [...sinZona], puntuaciones: puntos, media: puntos[0] }
  }

  // Semilla por edad, y el id como desempate para que sea estable: mismo
  // pool, mismo reparto. Ordenar por edad importa porque el spread de 10
  // años es la restricción que más difícil es arreglar después: sembrar al
  // azar mezcla generaciones y luego ningún intercambio lo deshace.
  // Por zonas primero y luego por edad. La edad sigue mandando dentro de
  // cada grupo —el spread de diez años es lo mas dificil de arreglar
  // despues— pero quien solo acepta una zona entra antes que quien acepta
  // tres, porque tiene menos huecos donde caber.
  const orden = [...sentables].sort(
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

  // Y si se pidió la corta, los que sobran se sientan juntos en una más,
  // siempre que lleguen al mínimo. Va DESPUÉS de los intercambios: la mesa
  // corta se queda con lo que sobre, no se lleva a nadie de una completa.
  if (permitirCorta && libres.length >= MINIMO_CORTA) {
    mesas.push(libres.splice(0, libres.length))
  }

  const puntuaciones = mesas.map((m) => puntuar(m, pesos))
  return {
    mesas,
    // Los que sobran del reparto MAS los que no tienen zona abierta: la
    // espera es "quien no se sienta esta fecha", venga de donde venga.
    espera: [...libres, ...sinZona],
    puntuaciones,
    media: puntuaciones.reduce((t, p) => t + p, 0) / (puntuaciones.length || 1),
  }
}
