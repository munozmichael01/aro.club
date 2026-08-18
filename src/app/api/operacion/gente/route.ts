import { NextResponse } from 'next/server'

import { familiasDe, planesDe } from '@/lib/formatos'
import { exigirOps } from '@/lib/ops'
import { leerCatalogo } from '@/lib/questionnaire/catalogo'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Gente: la base entera, en un solo pool.
 *
 * Hasta ahora operación solo veía a alguien si caía en una mesa. No había
 * forma de buscar a una persona por su nombre ni de responder «¿cuántas
 * mujeres de 30 a 40 aceptan Las Mercedes?», que es exactamente la pregunta
 * que decide si abrimos una fecha ahí.
 *
 * Devuelve UNA lista con perfiles y leads mezclados. Los leads son filas y no
 * una cifra: si el primer escalón del embudo dice 47, tiene que poder enseñar
 * a esos 47. De un lead solo hay correo, así que va enmascarado —el completo
 * se abre en la ficha, de una en una—.
 *
 * Los filtros y la búsqueda se aplican AQUÍ, no en el navegador: filtrar
 * delante significa haber mandado antes todas las filas al cliente, con sus
 * zonas y su historial dentro, y con miles eso es una pantalla que no abre.
 *
 * ## La lista va paginada; el mapa y el embudo, no
 *
 * Son dos preguntas distintas. La lista es «enséñame a estos», y de eso se
 * manda una página. El mapa de zonas y el embudo son «cuántos hay», y esos
 * cuentan sobre TODO lo que cumple el filtro: sacarlos de la página diría
 * que en Las Mercedes hay diez porque diez es el tamaño de página.
 *
 * ## Por qué se lee por tramos
 *
 * PostgREST devuelve como mucho mil filas por petición y no avisa: al pasar
 * de mil, un `select` normal se queda corto y el embudo empieza a contar
 * menos gente sin que falle nada. Por eso `todasLasFilas` insiste hasta el
 * final. Es lo mismo que pasaba con el cuestionario: no falla, miente.
 *
 * El día que esto tampoco baste —cuando recorrer la tabla entera por cada
 * petición se note—, el mapa y el embudo se mueven a SQL. Hoy no: dos
 * implementaciones del mismo número, una en JS y otra en la base, es cómo la
 * pantalla acaba dando dos respuestas a la misma pregunta.
 *
 * **No exporta y no manda nada.** Para llevarse los correos de los leads está
 * `/api/operacion/leads`, que es de admin y deja rastro.
 */

/** Cuántas filas por página si nadie dice otra cosa. */
const TAM = 10
const TAM_MAX = 200

/** El tope de PostgREST, que es lo que obliga a leer por tramos. */
const TRAMO = 1000

/**
 * Lee una tabla entera, en tramos de mil.
 *
 * Se para cuando un tramo viene incompleto, que es cómo se sabe que era el
 * último sin preguntar el total.
 */
async function todasLasFilas<T>(
  leer: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const filas: T[] = []
  for (let desde = 0; ; desde += TRAMO) {
    const { data, error } = await leer(desde, desde + TRAMO - 1)
    if (error) throw error
    const tramo = data ?? []
    filas.push(...tramo)
    if (tramo.length < TRAMO) return filas
  }
}

/** Lo que la pantalla pinta de cada fila. */
type Fila = {
  id: string
  nombre: string
  trato: string
  edad: number
  genero: string
  arraigo: string
  zonas: string[]
  formatos: string[]
  // Las cuatro que enseña la pantalla, derivadas aquí. La pantalla filtra por
  // familia y la base guarda el formato: si la traducción se hiciera delante,
  // el chip «Cenas» del mapa de zonas —que se calcula aquí— y el de los
  // filtros —que se calcularía allí— podrían dejar de significar lo mismo.
  familias: string[]
  estado: 'ok' | 'revision' | 'sin' | 'lead'
  cenas: number
  creditos: number
  dias: number
  industria: string
  espera: number
  /**
   * Solo de los leads: si pidió no recibir correos.
   *
   * Está aquí para que el botón de exportar pueda decir cuántos van a salir
   * de verdad. Sin esto la pantalla ofrecía «bajar los 3 correos» y el
   * fichero traía 2, que es la clase de descuadre que hace desconfiar de
   * todos los demás números de la pantalla.
   */
  deBaja: boolean
}

/** Días desde una fecha. La antigüedad se lee mejor así que con un timestamp. */
function diasDesde(iso: string | null): number {
  if (!iso) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000))
}

/**
 * `ana@gmail.com` → `an•••@gmail.com`.
 *
 * El dominio entero se deja porque dice algo útil —de dónde viene la gente—
 * y no identifica a nadie. Las dos primeras letras bastan para reconocer a
 * quien ya conoces sin publicar la dirección de quien no.
 */
function enmascarar(correo: string): string {
  const [antes, dominio] = String(correo || '').split('@')
  if (!dominio) return '•••'
  return antes.slice(0, 2) + '•••@' + dominio
}

/** La edad a partir de la fecha de nacimiento, que es lo que guardamos. */
function edadDe(nacimiento: string | null): number {
  if (!nacimiento) return 0
  const n = new Date(nacimiento)
  const h = new Date()
  let e = h.getFullYear() - n.getFullYear()
  const dm = h.getMonth() - n.getMonth()
  if (dm < 0 || (dm === 0 && h.getDate() < n.getDate())) e--
  return e > 0 && e < 120 ? e : 0
}

export async function GET(request: Request) {
  const actor = await exigirOps()
  // 404 y no 403: a quien no es de operación esta ruta no le existe.
  if (!actor) return new NextResponse(null, { status: 404 })

  const admin = createAdminClient()
  const url = new URL(request.url)

  // --- todo lo que hay que leer, de una vez ------------------------------
  //
  // En cadena esto eran cinco idas y vueltas a Supabase y casi dos segundos
  // por petición: se nota en cada clic, porque ahora cada filtro vuelve a
  // preguntar. Ninguna de estas consultas necesita el resultado de otra, así
  // que van juntas y el coste pasa a ser el de la más lenta.
  let perfiles, rasgos, saldos, esperas, verificados, leads, bajas, zonas, catalogo
  try {
    [perfiles, rasgos, saldos, esperas, verificados, leads, bajas, zonas, catalogo] = await Promise.all([
      todasLasFilas<{
        id: string; full_name: string | null; display_name: string | null
        birthdate: string | null; gender: string | null; rootedness: string | null
        status: string | null; events_attended: number | null; created_at: string
      }>((d, h) => admin
        .from('profiles')
        .select('id, full_name, display_name, birthdate, gender, rootedness, status, events_attended, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(d, h)),
      todasLasFilas<{ profile_id: string | null; zones: string[] | null; formats: string[] | null; industry: string | null; age: number | null; gender: string | null; rootedness: string | null }>(
        (d, h) => admin.from('profile_traits').select('profile_id, zones, formats, industry, age, gender, rootedness').range(d, h)),
      todasLasFilas<{ profile_id: string | null; balance: number | null }>(
        (d, h) => admin.from('v_credit_balance').select('profile_id, balance').range(d, h)),
      todasLasFilas<{ profile_id: string | null; veces: number | null }>(
        (d, h) => admin.from('v_espera_por_perfil').select('profile_id, veces').range(d, h)),
      todasLasFilas<{ id: string | null }>(
        (d, h) => admin.from('v_verified_profiles').select('id').range(d, h)),
      todasLasFilas<{ id: string; email: string; zones: string[] | null; rootedness: string | null; gender: string | null; birthdate: string | null; created_at: string }>(
        (d, h) => admin
          .from('waitlist')
          .select('id, email, zones, rootedness, gender, birthdate, created_at')
          .is('converted_profile_id', null)
          .order('created_at', { ascending: false })
          .range(d, h)),
      todasLasFilas<{ correo: string; deshecha_at: string | null }>(
        (d, h) => admin.from('bajas_correo').select('correo, deshecha_at').range(d, h)),
      todasLasFilas<{ slug: string; name: string }>(
        (d, h) => admin.from('zones').select('slug, name').eq('city_slug', 'caracas').eq('is_active', true).range(d, h)),
      // La industria se guarda por código —`tecnologia`, `otro`— y en pantalla
      // tiene que leerse como lo leyó quien contestó. El texto sale del
      // catálogo de la pregunta `sector`, que es donde vive: escribir aquí una
      // segunda lista de sectores es la copia que se queda vieja.
      leerCatalogo(),
    ])
  } catch (error) {
    console.error('[gente] no se pudo leer', error)
    return NextResponse.json({ error: 'No se pudo leer.' }, { status: 500 })
  }

  const sectores = new Map(
    (catalogo?.porClave.get('sector')?.opciones ?? []).map((o) => [o.valor, o.label]),
  )

  const deBaja = new Set(
    bajas.filter((b) => !b.deshecha_at).map((b) => String(b.correo).trim().toLowerCase()),
  )

  // Las vistas devuelven todas sus columnas como anulables —Postgres no puede
  // prometer lo contrario de un `select` con `group by`—, así que la clave
  // entra como `string | null` y las filas sin id se descartan.
  const porId = <T extends { profile_id: string | null }>(xs: T[] | null) =>
    new Map((xs ?? []).filter((x) => x.profile_id).map((x) => [x.profile_id as string, x]))

  const rasgoDe = porId(rasgos)
  const saldoDe = porId(saldos)
  const esperaDe = porId(esperas)
  const estanVerificados = new Set(verificados.map((v) => v.id).filter(Boolean))

  const filasPerfiles: Fila[] = perfiles.map((p) => {
    const r = rasgoDe.get(p.id)
    // El estado que pinta la pantalla no es el `status` crudo: lo que importa
    // aquí es si entra o no entra al reparto. Verificada es 'ok'; con
    // documentos subidos esperando a una persona es 'revision'; el resto es
    // 'sin', que es lo mismo que decir que hoy no puede sentarse.
    const estado: Fila['estado'] = estanVerificados.has(p.id)
      ? 'ok'
      : (p.status === 'pending_verification' ? 'revision' : 'sin')

    return {
      id: p.id,
      nombre: p.full_name ?? '—',
      trato: p.display_name ?? (p.full_name ?? '—').split(' ')[0],
      edad: r?.age ?? edadDe(p.birthdate),
      genero: (r?.gender ?? p.gender ?? '') as string,
      arraigo: (r?.rootedness ?? p.rootedness ?? '') as string,
      zonas: r?.zones ?? [],
      formatos: r?.formats ?? [],
      familias: familiasDe(r?.formats),
      estado,
      cenas: p.events_attended ?? 0,
      creditos: saldoDe.get(p.id)?.balance ?? 0,
      dias: diasDesde(p.created_at),
      industria: r?.industry ? (sectores.get(r.industry) ?? r.industry) : '',
      espera: esperaDe.get(p.id)?.veces ?? 0,
      // La baja de correos va por dirección y la exportación es solo de
      // leads, así que de un perfil no se pregunta.
      deBaja: false,
    }
  })

  // --- leads -------------------------------------------------------------
  // Solo los que no se convirtieron en cuenta —eso lo filtra la consulta—: si
  // no, la misma persona sale dos veces, como lead y como perfil, y el embudo
  // cuenta de más.

  const filasLeads: Fila[] = leads.map((l) => ({
    id: l.id,
    nombre: enmascarar(l.email),
    trato: String(l.email || '').split('@')[0],
    edad: edadDe(l.birthdate),
    genero: (l.gender ?? '') as string,
    arraigo: (l.rootedness ?? '') as string,
    zonas: l.zones ?? [],
    // La entrega 7 quitó `waitlist.formats`: del lead se sabe dónde, no qué.
    // Vacío es la verdad, y por eso un filtro de formato lo deja fuera.
    formatos: [],
    familias: [],
    estado: 'lead',
    cenas: 0,
    creditos: 0,
    dias: diasDesde(l.created_at),
    industria: '',
    espera: 0,
    deBaja: deBaja.has(String(l.email).trim().toLowerCase()),
  }))

  const todos = filasPerfiles.concat(filasLeads)

  // El chip de formato del mapa. Entra como FAMILIA —«cenas»— porque es lo
  // que enseña la pantalla, y también se acepta un plan suelto. Son PLANES
  // del cuestionario, no formatos de evento: aquí se pregunta por lo que
  // quiere la gente, y eso es lo que hay en `profile_traits`.
  //
  // Es distinto del filtro de formato de la lista: este recorta el mapa —«¿en
  // qué zona hay gente para una cena?»— y aquel recorta quién sale abajo.
  const formato = url.searchParams.get('formato')
  const planesPedidos = formato ? planesDe(formato) : null
  const sirve = (p: Fila) =>
    !planesPedidos || p.formatos.some((f) => planesPedidos.includes(f))

  // --- el mapa de zonas --------------------------------------------------
  //
  // LA REGLA QUE NO SE PUEDE ROMPER: las mesas se cuentan sobre VERIFICADOS,
  // nunca sobre el total. Quien no está verificada no entra al reparto, así
  // que no puede contar para prometer una mesa. Se devuelven las dos cifras
  // —total y verificados— para que la pantalla pueda decirlo cuando difieren;
  // con una sola, la misma pantalla daría dos respuestas a la misma pregunta.
  //
  // Y se cuenta sobre TODOS, no sobre la página: la página es de cuántos se
  // enseñan, no de cuántos hay.
  const mapa = zonas.map((z) => {
    const enZona = todos.filter((p) => p.zonas.includes(z.slug) && sirve(p))
    const listos = enZona.filter((p) => p.estado === 'ok')
    return {
      slug: z.slug,
      nombre: z.name,
      total: enZona.length,
      verificados: listos.length,
      // Seis por mesa. Es división entera a propósito: cinco personas no son
      // «casi una mesa», son ninguna.
      mesas: Math.floor(listos.length / 6),
      faltan: listos.length % 6 === 0 ? 0 : 6 - (listos.length % 6),
    }
  }).sort((a, b) => b.verificados - a.verificados || a.nombre.localeCompare(b.nombre, 'es'))

  // --- el embudo ---------------------------------------------------------
  // Siete escalones. Cada uno cuenta a quien llegó HASTA ahí, así que son
  // acumulativos hacia abajo y por eso cada número es menor que el anterior.
  //
  // Cada escalón se calcula sobre el ANTERIOR, no sobre el total. Es la
  // diferencia entre un embudo y siete cuentas sueltas: calculados aparte,
  // «subió cédula» salía 6 y «contestó el cuestionario» 5 —un embudo que
  // crece hacia abajo, porque se puede subir la cédula sin terminar las
  // preguntas—. Anidados, cada número es cuánta gente llegó de verdad hasta
  // ahí, que es lo que se está preguntando.
  const escalones: { paso: string; etiqueta: string; pasa: (p: Fila) => boolean }[] = [
    { paso: 'correo', etiqueta: 'Dejó el correo', pasa: () => true },
    { paso: 'datos', etiqueta: 'Completó sus datos', pasa: (p) => p.estado !== 'lead' },
    { paso: 'cuestionario', etiqueta: 'Contestó el cuestionario', pasa: (p) => p.zonas.length > 0 },
    { paso: 'documentos', etiqueta: 'Subió su cédula', pasa: (p) => p.estado !== 'sin' },
    { paso: 'verificada', etiqueta: 'Verificada', pasa: (p) => p.estado === 'ok' },
    { paso: 'reservo', etiqueta: 'Reservó', pasa: (p) => p.cenas > 0 || p.creditos > 0 },
    { paso: 'fue', etiqueta: 'Fue a una mesa', pasa: (p) => p.cenas > 0 },
  ]

  let quedan = todos
  const embudo = escalones.map((e) => {
    quedan = quedan.filter(e.pasa)
    return { paso: e.paso, etiqueta: e.etiqueta, cuenta: quedan.length }
  })

  // --- los filtros de la lista -------------------------------------------
  //
  // Estaban en el navegador y tenían que bajar aquí: con la lista paginada,
  // filtrar delante filtraría solo la página que se ve, y «tres mujeres de
  // Chacao» significaría «tres de las diez que te mandé», que no es lo que
  // nadie entiende al leerlo.
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
  const fEstado = url.searchParams.get('estado')
  const fGenero = url.searchParams.get('genero')
  const fArraigo = url.searchParams.get('arraigo')
  const fEdad = url.searchParams.get('edad')
  const fFamilia = url.searchParams.get('familia')
  const fZona = url.searchParams.get('zona')
  const fAtajo = url.searchParams.get('atajo')
  const fEscalon = Number(url.searchParams.get('escalon') ?? -1)

  const tramoEdad = (p: Fila) => (p.edad < 32 ? 'j' : p.edad <= 37 ? 'm' : 'v')

  const ATAJOS: Record<string, (p: Fila) => boolean> = {
    cred: (p) => p.creditos > 0 && p.cenas === 0,
    espera: (p) => p.espera > 0 && p.cenas === 0,
    dormidos: (p) => p.cenas > 0 && p.dias > 60,
  }

  // El escalón del embudo es un filtro más, y ANIDADO: pinchar «subió su
  // cédula» aplica también los tres de arriba. Suelto dejaba dentro a los
  // leads —que no tienen estado 'sin'— y la lista enseñaba más gente que el
  // número que se acababa de pulsar.
  const pasaEscalon = (p: Fila) =>
    fEscalon < 0 || escalones.slice(0, fEscalon + 1).every((e) => e.pasa(p))

  // La búsqueda mira el nombre y, del lead, lo de antes de la arroba: en la
  // lista su correo va enmascarado, pero buscar «ana» tiene que encontrarlo.
  // El correo entero sigue saliendo solo en su ficha.
  const casa = (p: Fila) =>
    !q || p.nombre.toLowerCase().includes(q) || p.trato.toLowerCase().includes(q)

  /** `salvo` es el grupo que se está contando: su propia opción no se aplica. */
  const pasa = (p: Fila, salvo?: string) => {
    if (!pasaEscalon(p)) return false
    if (!casa(p)) return false
    if (fZona && !p.zonas.includes(fZona)) return false
    if (fAtajo && ATAJOS[fAtajo] && !ATAJOS[fAtajo](p)) return false
    if (salvo !== 'estado' && fEstado && p.estado !== fEstado) return false
    if (salvo !== 'genero' && fGenero && p.genero !== fGenero) return false
    if (salvo !== 'arraigo' && fArraigo && p.arraigo !== fArraigo) return false
    if (salvo !== 'edad' && fEdad && tramoEdad(p) !== fEdad) return false
    if (salvo !== 'formato' && fFamilia && !p.familias.includes(fFamilia)) return false
    return true
  }

  const filtrada = todos.filter((p) => pasa(p))

  // --- cuánta gente deja dentro cada opción ------------------------------
  //
  // Sobre lo YA filtrado y no sobre el total, que es lo que hace que cruzar
  // filtros sea una conversación y no una lotería. Se calcula aquí porque
  // aquí está la lista entera: en el navegador solo hay una página.
  const cuentaPor = (grupo: string, valorDe: (p: Fila) => string | string[]) => {
    const cuenta: Record<string, number> = {}
    for (const p of todos) {
      if (!pasa(p, grupo)) continue
      const v = valorDe(p)
      for (const x of Array.isArray(v) ? v : [v]) {
        if (x) cuenta[x] = (cuenta[x] ?? 0) + 1
      }
    }
    return cuenta
  }

  const cuentas = {
    estado: cuentaPor('estado', (p) => p.estado),
    genero: cuentaPor('genero', (p) => p.genero),
    arraigo: cuentaPor('arraigo', (p) => p.arraigo),
    edad: cuentaPor('edad', tramoEdad),
    formato: cuentaPor('formato', (p) => p.familias),
  }

  // Los tres atajos se cuentan sobre los perfiles enteros, como siempre: son
  // preguntas sobre el histórico de alguien, no un filtro más de la lista.
  const soloPerfiles = todos.filter((p) => p.estado !== 'lead')
  const atajos = {
    cred: soloPerfiles.filter(ATAJOS.cred).length,
    espera: soloPerfiles.filter(ATAJOS.espera).length,
    dormidos: soloPerfiles.filter(ATAJOS.dormidos).length,
  }

  // --- la página ---------------------------------------------------------
  const tam = Math.min(Math.max(Number(url.searchParams.get('tam') ?? TAM) || TAM, 1), TAM_MAX)
  const desde = Math.max(Number(url.searchParams.get('desde') ?? 0) || 0, 0)
  const pagina = filtrada.slice(desde, desde + tam)

  const leadsVivos = todos.filter((p) => p.estado === 'lead')

  return NextResponse.json({
    gente: pagina,
    // Cuántos cumplen el filtro, no cuántos se mandan: la pantalla enseña ese
    // número en grande y es el que decide si una fecha se puede abrir. Con
    // los verificados al lado, porque la frase de las mesas se cuenta sobre
    // ellos y la página no puede saberlo mirando diez filas.
    resultado: {
      total: filtrada.length,
      verificados: filtrada.filter((p) => p.estado === 'ok').length,
    },
    pagina: { desde, tam, hayMas: desde + tam < filtrada.length },
    cuentas,
    atajos,
    zonas: mapa,
    embudo,
    // Sobre la base entera, sin filtro: es la bajada de la pestaña.
    total: todos.length,
    verificados: todos.filter((p) => p.estado === 'ok').length,
    perfiles: todos.length - leadsVivos.length,
    // Para el botón de exportar, que promete un número de correos.
    leads: { total: leadsVivos.length, deBaja: leadsVivos.filter((p) => p.deBaja).length },
  })
}
