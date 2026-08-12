import { NextResponse } from 'next/server'

import { diaCompleto, diaYMes, mesYAno } from '@/lib/fechas'
import { leerCatalogo } from '@/lib/questionnaire/catalogo'
import { exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * La ficha de un miembro, para operación (entrega 7).
 *
 * Es de SOLO LECTURA. Aprobar o rechazar sigue viviendo en
 * `/api/operacion/verificaciones`: la ficha enseña, no decide, y tener dos
 * rutas que escriben la misma verificación es cómo se acaba aprobando dos
 * veces con criterios distintos.
 *
 * Dos cosas que no salen de aquí aunque estén en la base:
 *
 *  - **La respuesta de `romance`**. Se guarda porque el reparto la usa; no
 *    se enseña a nadie, tampoco a operación. Lo que sale es que respondió.
 *  - **La foto del documento pasados 90 días**. No es una carencia: se
 *    borró, y lo que queda es la marca de que ocurrió y quién la aprobó.
 */

/** Lo que se guarda pero no se lee. La lista corta y explícita, a propósito. */
const RESERVADAS = new Set(['romance'])

/** Y lo que se enseña pero avisando de que es interno. */
const INTERNAS = new Set(['empleador'])

const edadDe = (nacimiento: string | null) => {
  if (!nacimiento) return null
  const n = new Date(nacimiento)
  const hoy = new Date()
  let e = hoy.getFullYear() - n.getFullYear()
  const m = hoy.getMonth() - n.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) e--
  return e
}


export async function GET(request: Request) {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta el miembro.' }, { status: 400 })

  const admin = createAdminClient()

  const { data: perfil, error: errorPerfil } = await admin
    .from('profiles')
    .select('id, full_name, display_name, birthdate, gender, phone_e164, created_at, status')
    .eq('id', id)
    .maybeSingle()

  if (errorPerfil) {
    console.error('[miembro] perfil', errorPerfil)
    return NextResponse.json({ error: 'No pudimos leer la ficha.' }, { status: 500 })
  }
  if (!perfil) return NextResponse.json({ error: 'Ese miembro no existe.' }, { status: 404 })

  // El correo vive en auth, no en `profiles`.
  const { data: cuenta } = await admin.auth.admin.getUserById(id)

  // --- verificación -----------------------------------------------------
  const { data: verificaciones } = await admin
    .from('verifications')
    .select('kind, status, storage_path, name_matches, age_confirmed, reviewed_by, reviewed_at, created_at')
    .eq('profile_id', id)
    .order('created_at', { ascending: false })

  const vivas = verificaciones ?? []
  const aprobadas = vivas.filter((v) => v.status === 'approved')
  const pendientes = vivas.filter((v) => v.status === 'pending')
  const rechazadas = vivas.filter((v) => v.status === 'rejected')

  const completa = new Set(aprobadas.map((v) => v.kind))
  const estado = completa.has('id_document') && completa.has('selfie')
    ? 'verificada'
    : pendientes.length
      ? 'revision'
      : rechazadas.length
        ? 'rechazada'
        : 'revision'

  const decisiva = aprobadas[0] ?? pendientes[0] ?? rechazadas[0] ?? null

  const { data: revisor } = decisiva?.reviewed_by
    ? await admin.from('profiles').select('full_name').eq('id', decisiva.reviewed_by).maybeSingle()
    : { data: null }

  // Las fotos siguen la misma regla que la cola: una firma de cinco
  // minutos, el tiempo de mirarlas. Una URL permanente en el historial del
  // navegador de quien revisa es exactamente lo que el bucket privado evita.
  const fotos: Record<string, string | null> = { cedula: null, selfie: null }
  for (const v of vivas) {
    if (!v.storage_path) continue
    const clave = v.kind === 'id_document' ? 'cedula' : v.kind === 'selfie' ? 'selfie' : null
    if (!clave || fotos[clave]) continue
    const { data } = await admin.storage.from('verificaciones').createSignedUrl(v.storage_path, 300)
    fotos[clave] = data?.signedUrl ?? null
  }

  // Sin captura hay dos casos distintos y decir el que no es sería mentir
  // sobre lo que prometimos en el legal: la purga de los 90 días solo ha
  // pasado si la aprobación es de hace más de 90 días.
  const NOVENTA = 90 * 24 * 3600 * 1000
  const revisadaHace = decisiva?.reviewed_at
    ? Date.now() - new Date(decisiva.reviewed_at).getTime()
    : 0
  const sinCaptura = !fotos.cedula && !fotos.selfie
  const borrado = estado === 'verificada' && sinCaptura && revisadaHace > NOVENTA
  const nuncaHubo = sinCaptura && !borrado

  const coincide = decisiva?.name_matches == null
    ? 'Sin comprobar todavía'
    : decisiva.name_matches && decisiva.age_confirmed
      ? 'Nombre y edad coincidían'
      : decisiva.name_matches
        ? 'El nombre coincidía; la edad no se confirmó'
        : 'El nombre no coincidía'

  // --- historial --------------------------------------------------------
  const { data: reservas } = await admin
    .from('bookings')
    .select('id, status, event_id, events(starts_at, zone_slug)')
    .eq('profile_id', id)
    .order('created_at', { ascending: false })

  const idsEvento = (reservas ?? []).map((r) => r.event_id)

  const { data: miembros } = await admin
    .from('table_members')
    .select('table_id, booking_id, dinner_tables!inner(event_id, restaurants!dinner_tables_restaurant_id_fkey(name))')
    .eq('profile_id', id)
    .in('dinner_tables.event_id', idsEvento.length ? idsEvento : ['00000000-0000-0000-0000-000000000000'])

  const mesaDe = new Map(
    (miembros ?? []).map((m) => [
      m.booking_id,
      m as unknown as { table_id: string; dinner_tables: { restaurants: { name: string } | null } },
    ]),
  )

  // Con quién cenó cada vez, y su propia valoración de esa mesa.
  const idsMesa = [...mesaDe.values()].map((m) => m.table_id)
  const { data: comensales } = await admin
    .from('table_members')
    .select('table_id, profile_id, seat_order, profiles(display_name, full_name)')
    .in('table_id', idsMesa.length ? idsMesa : ['00000000-0000-0000-0000-000000000000'])
    .neq('profile_id', id)
    .order('seat_order')

  const { data: valoraciones } = await admin
    .from('table_feedback')
    .select('table_id, would_repeat, conversation_rating')
    .eq('profile_id', id)

  // Los bloqueos viven en `exclusions` y solo ahí. `created_by` distingue
  // los que puso ella de los que le pusieron a ella.
  const { data: exclusiones } = await admin
    .from('exclusions')
    .select('profile_a, profile_b, reason, created_by')
    .or(`profile_a.eq.${id},profile_b.eq.${id}`)

  const conQuien = (exclusiones ?? []).map((e) => ({
    otro: e.profile_a === id ? e.profile_b : e.profile_a,
    reason: e.reason,
    mia: e.created_by === id,
  }))
  const bloqueosSuyos = conQuien.filter((e) => e.mia)

  const { data: zonas } = await admin.from('zones').select('slug, name')
  const nombreZona = new Map((zonas ?? []).map((z) => [z.slug, z.name]))

  const valorDe = new Map((valoraciones ?? []).map((v) => [v.table_id, v]))

  // Un bloqueo no pertenece a una mesa: es de una pareja y es permanente.
  // «Bloqueó a una persona de esa mesa» se deriva cruzando sus bloqueos con
  // quién se sentó con ella cada vez.
  const suyos = new Set(bloqueosSuyos.map((e) => e.otro))
  const bloqueosPorMesa = new Map<string, number>()
  for (const c of comensales ?? []) {
    if (!suyos.has(c.profile_id)) continue
    bloqueosPorMesa.set(c.table_id, (bloqueosPorMesa.get(c.table_id) ?? 0) + 1)
  }

  // `confirmed` no es «fue»: es «tiene puesto». Contarlo como cena inflaba
  // el historial con fechas que todavia no han ocurrido, que es justo el
  // numero que alguien mira para decidir si esta persona es de fiar.
  const estadoDe = (status: string, empieza: number) => {
    if (status === 'attended') return 'Fue'
    if (status === 'no_show') return 'No apareció'
    if (status === 'cancelled_by_user') return 'Canceló'
    if (status === 'cancelled_by_ops') return 'Cancelada por nosotros'
    if (status === 'confirmed') return empieza < Date.now() ? 'Fue' : 'Apuntada'
    return null
  }

  const historial = (reservas ?? [])
    .map((r) => {
      const ev = r.events as unknown as { starts_at: string; zone_slug: string | null }
      const mesa = mesaDe.get(r.id)
      const d = new Date(ev.starts_at)
      const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

      const val = mesa ? valorDe.get(mesa.table_id) : null
      const cuantos = mesa ? (bloqueosPorMesa.get(mesa.table_id) ?? 0) : 0

      // La nota se arma con lo que ella dijo. Si no valoró, se dice que no
      // valoró: rellenar el hueco con una frase amable sería inventarse una
      // opinión suya, y esta ficha se usa para decidir sobre personas.
      const cual = estadoDe(r.status, new Date(ev.starts_at).getTime())
      if (!cual) return null

      const nota = cual === 'Apuntada'
        ? 'Todavía no ha ocurrido.'
        : r.status === 'cancelled_by_user'
        ? 'Canceló. El crédito se devolvió si avisó con más de 24 h.'
        : !mesa
          ? 'No llegó a tener mesa.'
          : !val
            ? 'No valoró esa mesa.'
            : (val.conversation_rating === 5
                ? 'Volvería sin dudarlo. '
                : val.conversation_rating === 3
                  ? 'Estuvo bien. '
                  : 'No volvería. ') +
              (cuantos === 0
                ? 'No bloqueó a nadie.'
                : cuantos === 1
                  ? 'Bloqueó a una persona de esa mesa.'
                  : `Bloqueó a ${cuantos} personas de esa mesa.`)

      return {
        // Una fecha apuntada todavia no tiene restaurante, y decir "Sin
        // restaurante" se lee como un fallo nuestro cuando es lo normal.
        sitio: mesa?.dinner_tables?.restaurants?.name
          ?? (cual === 'Apuntada' ? 'Todavía sin mesa' : 'Sin mesa'),
        cuando: `${DIAS[d.getDay()]} ${diaYMes(ev.starts_at)}` +
          (ev.zone_slug ? ` · ${nombreZona.get(ev.zone_slug) ?? ev.zone_slug}` : ''),
        estado: cual,
        gente: mesa
          ? (comensales ?? [])
              .filter((c) => c.table_id === mesa.table_id)
              .map((c) => {
                const p = c.profiles as unknown as { display_name: string | null; full_name: string | null } | null
                return p?.display_name || p?.full_name?.split(' ')[0] || '—'
              })
          : [],
        nota,
      }
    })
    .filter((h): h is NonNullable<typeof h> => h !== null)

  // --- respuestas -------------------------------------------------------
  const catalogo = await leerCatalogo()

  const { data: version } = await admin
    .from('questionnaire_versions')
    .select('id')
    .eq('is_active', true)
    .maybeSingle()

  const { data: respuestas } = await admin
    .from('answers')
    .select('question_key, value')
    .eq('profile_id', id)
    .eq('version_id', version?.id ?? 0)

  const dadas = new Map((respuestas ?? []).map((a) => [a.question_key, a.value]))

  const preguntas = (catalogo?.preguntas ?? []).map((q) => {
    const bruto = dadas.get(q.clave)
    const codigos = bruto == null ? [] : Array.isArray(bruto) ? (bruto as string[]) : [String(bruto)]
    const etiqueta = new Map(q.opciones.map((o) => [o.valor, o.label]))
    // Se resuelve por código, nunca por posición. Si un código dejó de
    // existir en el catálogo se enseña tal cual, que es la señal de que hay
    // una respuesta vieja que alguien tiene que mirar.
    const legible = codigos.map((c) => etiqueta.get(c) ?? c).join(', ')

    return {
      clave: q.clave,
      pantalla: q.pantalla,
      enunciado: q.enunciado,
      reservada: RESERVADAS.has(q.clave) || INTERNAS.has(q.clave),
      valor: RESERVADAS.has(q.clave)
        ? (codigos.length ? 'Respondida · no se enseña nunca' : 'Sin responder')
        : (legible || 'Sin responder'),
    }
  })

  // --- señales ----------------------------------------------------------
  const { data: reportesSuyos } = await admin
    .from('incident_reports')
    .select('id')
    .eq('reporter_id', id)

  const { data: reportesSobre } = await admin
    .from('incident_reports')
    .select('id, severity, resolved_at')
    .eq('subject_id', id)

  const nSuyos = bloqueosSuyos.length
  const recibidos = conQuien.filter((e) => !e.mia).length
  const mesas = historial.filter((h) => h.estado === 'Fue').length
  const enMesas = mesas === 0 ? 'Todavía no ha ido a ninguna mesa.' : `En ${mesas === 1 ? 'una mesa' : mesas + ' mesas'}.`

  const senales: { tono: 'bloqueo' | 'limpio' | 'aviso'; titulo: string; cuerpo: string; interno: boolean }[] = [
    nSuyos === 0
      ? { tono: 'limpio', titulo: 'Sin bloqueos', cuerpo: enMesas, interno: false }
      : {
          tono: 'bloqueo',
          titulo: nSuyos === 1 ? 'Bloqueó a una persona' : `Bloqueó a ${nSuyos} personas`,
          cuerpo: 'No vuelve a coincidir con ellas y ellas no lo saben.',
          interno: true,
        },
    recibidos === 0
      ? { tono: 'limpio', titulo: 'Nadie la ha bloqueado', cuerpo: enMesas, interno: false }
      : {
          // Que la bloqueen no es una falta: mucha gente bloquea sin más.
          // Se marca como aviso a partir de dos, que ya es un patrón.
          tono: recibidos >= 2 ? 'aviso' : 'bloqueo',
          titulo: recibidos === 1 ? 'Una persona la bloqueó' : `${recibidos} personas la bloquearon`,
          cuerpo: 'Ella no lo sabe y no se le dice nunca.',
          interno: true,
        },
  ]

  const sinResolver = (reportesSobre ?? []).filter((r) => !r.resolved_at).length
  senales.push(
    (reportesSobre ?? []).length === 0 && (reportesSuyos ?? []).length === 0
      ? { tono: 'limpio', titulo: 'Sin reportes', cuerpo: 'Ni suyos ni sobre ella.', interno: false }
      : {
          tono: (reportesSobre ?? []).length ? 'aviso' : 'limpio',
          titulo: (reportesSobre ?? []).length
            ? `${(reportesSobre ?? []).length} ${(reportesSobre ?? []).length === 1 ? 'reporte' : 'reportes'} sobre ella`
            : `${(reportesSuyos ?? []).length} ${(reportesSuyos ?? []).length === 1 ? 'reporte' : 'reportes'} suyos`,
          cuerpo: (reportesSobre ?? []).length
            ? (sinResolver ? `${sinResolver} sin resolver. Míralo antes de dejarla entrar a otra mesa.` : 'Todos revisados y cerrados.')
            : 'Los puso ella. No cuentan en su contra.',
          interno: true,
        },
  )

  // --- créditos ---------------------------------------------------------
  const { data: movimientos } = await admin
    .from('credit_ledger')
    .select('delta, reason, created_at, note, bookings(events(starts_at))')
    .eq('profile_id', id)
    .order('created_at', { ascending: true })

  const CONCEPTO: Record<string, string> = {
    pack_purchase: 'Compra de créditos',
    event_charge: 'Cena',
    refund: 'Devolución por cancelar',
    goodwill: 'Cortesía',
    referral_bonus: 'Por invitar a alguien',
    no_show_penalty: 'No apareció',
    expiry: 'Caducados',
    manual_adjustment: 'Ajuste a mano',
  }

  const { data: saldo } = await admin
    .from('v_credit_balance')
    .select('balance')
    .eq('profile_id', id)
    .maybeSingle()

  const sector = preguntas.find((p) => p.clave === 'sector')?.valor

  return NextResponse.json({
    identidad: {
      trato: perfil.display_name || perfil.full_name?.split(' ')[0] || '—',
      completo: perfil.full_name || '—',
      edad: edadDe(perfil.birthdate),
      genero: perfil.gender === 'mujer' ? 'Mujer' : perfil.gender === 'hombre' ? 'Hombre' : perfil.gender ?? '—',
      sector: sector && sector !== 'Sin responder' ? sector : '—',
      telefono: perfil.phone_e164
        ? perfil.phone_e164.replace(/^(\+58)(\d{3})(\d{3})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5')
        : '—',
      correo: cuenta?.user?.email ?? '—',
      desde: mesYAno(perfil.created_at),
    },
    verificacion: {
      estado,
      quien: revisor?.full_name ?? null,
      cuando: decisiva?.reviewed_at
        ? diaCompleto(decisiva.reviewed_at)
        : decisiva?.created_at
          ? `Esperando desde el ${diaCompleto(decisiva.created_at)}`
          : '—',
      coincide,
      borrado,
      // Ni borrada ni disponible: no se subió nunca. Se dice tal cual en vez
      // de enseñar dos recuadros vacíos.
      nuncaHubo,
      // Cuántos intentos rechazados hubo antes de este. No es un dato de
      // adorno: tres rechazos seguidos es la señal de que hay que mirar
      // despacio antes de aprobar el cuarto.
      intentos: rechazadas.length,
      cedula: fotos.cedula,
      selfie: fotos.selfie,
    },
    historial,
    preguntas,
    senales,
    creditos: saldo?.balance ?? 0,
    movimientos: (movimientos ?? []).map((m) => {
      const ev = (m.bookings as unknown as { events: { starts_at: string } | null } | null)?.events
      return {
        concepto: CONCEPTO[m.reason] ?? m.reason,
        cuando: ev ? diaCompleto(ev.starts_at) : diaCompleto(m.created_at),
        delta: (m.delta > 0 ? '+' : '') + m.delta,
      }
    }),
  })
}
