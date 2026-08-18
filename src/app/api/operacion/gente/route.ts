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
 * Los filtros se aplican AQUÍ, no en el navegador: con 500 filas, filtrar
 * delante significa haber mandado antes las 500 al cliente, con sus zonas y
 * su historial dentro.
 *
 * **No exporta y no manda nada.** Es para saber, no para disparar.
 */

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

  // --- perfiles ----------------------------------------------------------
  const { data: perfiles, error } = await admin
    .from('profiles')
    .select('id, full_name, display_name, birthdate, gender, rootedness, status, events_attended, created_at')
    .is('deleted_at', null)

  if (error) {
    console.error('[gente] no se pudieron leer los perfiles', error)
    return NextResponse.json({ error: 'No se pudo leer.' }, { status: 500 })
  }

  // La industria se guarda por código —`tecnologia`, `otro`— y en pantalla
  // tiene que leerse como lo leyó quien contestó. El texto sale del catálogo
  // de la pregunta `sector`, que es donde vive: escribir aquí una segunda
  // lista de sectores es exactamente la copia que se queda vieja.
  const catalogo = await leerCatalogo()
  const sectores = new Map(
    (catalogo?.porClave.get('sector')?.opciones ?? []).map((o) => [o.valor, o.label]),
  )

  // Zonas, formatos e industria viven en los rasgos, que es lo que deja el
  // cuestionario. Quien no lo terminó no tiene fila aquí, y eso está bien:
  // aparece con las zonas vacías, que es la verdad.
  const [{ data: rasgos }, { data: saldos }, { data: esperas }, { data: verificados }] =
    await Promise.all([
      admin.from('profile_traits').select('profile_id, zones, formats, industry, age, gender, rootedness'),
      admin.from('v_credit_balance').select('profile_id, balance'),
      admin.from('v_espera_por_perfil').select('profile_id, veces'),
      admin.from('v_verified_profiles').select('id'),
    ])

  // Las vistas devuelven todas sus columnas como anulables —Postgres no puede
  // prometer lo contrario de un `select` con `group by`—, así que la clave
  // entra como `string | null` y las filas sin id se descartan.
  const porId = <T extends { profile_id: string | null }>(xs: T[] | null) =>
    new Map((xs ?? []).filter((x) => x.profile_id).map((x) => [x.profile_id as string, x]))

  const rasgoDe = porId(rasgos)
  const saldoDe = porId(saldos)
  const esperaDe = porId(esperas)
  const estanVerificados = new Set((verificados ?? []).map((v) => v.id))

  const filasPerfiles: Fila[] = (perfiles ?? []).map((p) => {
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
  // Solo los que no se convirtieron en cuenta: si no, la misma persona sale
  // dos veces —como lead y como perfil— y el embudo cuenta de más.
  const [{ data: leads }, { data: bajas }] = await Promise.all([
    admin
      .from('waitlist')
      .select('id, email, zones, rootedness, gender, birthdate, created_at, converted_profile_id')
      .is('converted_profile_id', null),
    admin.from('bajas_correo').select('correo, deshecha_at'),
  ])

  const deBaja = new Set(
    (bajas ?? []).filter((b) => !b.deshecha_at).map((b) => String(b.correo).trim().toLowerCase()),
  )

  const filasLeads: Fila[] = (leads ?? []).map((l) => ({
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

  // --- el mapa de zonas --------------------------------------------------
  //
  // LA REGLA QUE NO SE PUEDE ROMPER: las mesas se cuentan sobre VERIFICADOS,
  // nunca sobre el total. Quien no está verificada no entra al reparto, así
  // que no puede contar para prometer una mesa. Se devuelven las dos cifras
  // —total y verificados— para que la pantalla pueda decirlo cuando difieren;
  // con una sola, la misma pantalla daría dos respuestas a la misma pregunta.
  //
  // El filtro entra como FAMILIA —«cenas»— porque es lo que enseña la
  // pantalla, y también se acepta un plan suelto —«cena-gastronomica»—. Una
  // familia son hasta cinco planes: pedirle a operación que marque los cinco
  // de «movimiento» para preguntar «¿dónde hay gente para salir a la calle?»
  // sería trasladarle una decisión de esquema.
  //
  // Y son PLANES del cuestionario, no formatos de evento: aquí se pregunta
  // por lo que quiere la gente, y eso es lo que hay en `profile_traits`.
  const formato = url.searchParams.get('formato')
  const formatosPedidos = formato ? planesDe(formato) : null
  const sirve = (p: Fila) =>
    !formatosPedidos || p.formatos.some((f) => formatosPedidos.includes(f))

  const { data: zonas } = await admin
    .from('zones')
    .select('slug, name')
    .eq('city_slug', 'caracas')
    .eq('is_active', true)

  const mapa = (zonas ?? []).map((z) => {
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

  return NextResponse.json({
    gente: todos,
    zonas: mapa,
    embudo,
    // Para que la pantalla no tenga que deducirlo de la lista.
    total: todos.length,
    verificados: todos.filter((p) => p.estado === 'ok').length,
  })
}
