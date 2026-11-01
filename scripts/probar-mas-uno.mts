/**
 * «+1 acompañante» de punta a punta, contra la base, sin tocar a nadie.
 *
 *   npm_config_cache=/tmp/npmcache npx --yes tsx --conditions=react-server scripts/probar-mas-uno.mts
 *
 * Monta una fecha +1 de prueba con ocho cuentas de prueba en
 * @prueba.aro.club (a ese dominio no sale ningún correo y sin teléfono
 * registrado no sale ninguna push) y recorre lo que decidió Michael el 01-11:
 *
 *   1. La casilla del aviso es obligatoria en una fecha +1.
 *   2. Ana reserva y tiene un enlace; Beto y Cata entran por él sin estar
 *      verificados. Se aprueba primero Cata: el puesto es suyo, y Beto ve
 *      «Esta invitación ya se usó».
 *   3. Ana cambia de acompañante: Cata se queda sin puesto y se entera, el
 *      enlace viejo deja de valer y Beto, ya verificado, entra al instante
 *      por el nuevo. Beto se baja: Ana recibe un enlace nuevo y Beto vuelve.
 *   4. Dos dúos más y Hugo sin acompañante. El reparto sienta los tres dúos
 *      juntos en una mesa y deja a Hugo fuera.
 *   5. El aviso del día antes del cierre sale una vez y solo a Hugo; al
 *      cierre se le cancelan los dos puestos y vuelven dos créditos.
 *   6. Cancelar devuelve lo que costó: dos créditos a quien reserva, nada al
 *      acompañante.
 *   7. Los cinco correos se componen sin error.
 *
 * Y lo borra todo al final, falle o no.
 */
import fs from 'node:fs'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const i = l.indexOf('=')
  if (i > 0 && !process.env[l.slice(0, i).trim()]) process.env[l.slice(0, i).trim()] = l.slice(i + 1).trim()
}

const { createClient } = await import('@supabase/supabase-js')
const M = await import('../src/lib/mas-uno')
const { construirPool } = await import('../src/lib/reparto/pool')
const { repartir } = await import('../src/lib/reparto/repartir')
const { componer } = await import('../src/lib/remitente')

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let fallos = 0
const ver = (que: string, ok: boolean, detalle?: unknown) => {
  console.log((ok ? '  ✓ ' : '  ✗ ') + que + (ok || detalle === undefined ? '' : ' → ' + JSON.stringify(detalle)))
  if (!ok) fallos++
}

// Nombre, género y si nace verificada. Beto y Cata entran sin verificar.
const gente = [
  ['Ana', 'mujer', true], ['Beto', 'hombre', false], ['Cata', 'mujer', false],
  ['Dani', 'mujer', true], ['Eli', 'hombre', true],
  ['Fer', 'hombre', true], ['Gabi', 'mujer', true],
  ['Hugo', 'hombre', true],
] as const
const ids: string[] = []
let eventoId = ''

const { data: version } = await admin.from('questionnaire_versions').select('id').eq('is_active', true).single()
const { data: preguntas } = await admin
  .from('questions')
  .select('key, options, input_type, min_select, exclusive_value')
  .eq('version_id', version!.id)
  .eq('is_required', true)

/** Las respuestas obligatorias, que VALEN: lo mismo que el banco de pruebas. */
function respuestasDe(id: string) {
  return (preguntas ?? []).map((q) => {
    const cods = ((q.options ?? []) as { value: string }[]).map((o) => o.value).filter((c) => c !== q.exclusive_value)
    let valor: unknown
    if (q.input_type === 'date') valor = '1991-03-14'
    else if (q.input_type === 'text') valor = 'Prueba del +1'
    else if (q.input_type === 'multi') valor = cods.slice(0, Math.max(q.min_select || 1, 1))
    else valor = cods[0] ?? null
    return { profile_id: id, version_id: version!.id, question_key: q.key, value: valor }
  }).filter((f) => f.value !== null && !(Array.isArray(f.value) && !f.value.length))
}

const aprobar = (id: string) => admin.from('verifications').insert([
  { profile_id: id, kind: 'id_document', status: 'approved', reviewed_at: new Date().toISOString(), storage_path: id + '/id.jpg' },
  { profile_id: id, kind: 'selfie', status: 'approved', reviewed_at: new Date().toISOString(), storage_path: id + '/selfie.jpg' },
] as never)

try {
  for (const [k, [n, genero, verificada]] of gente.entries()) {
    const { data, error } = await admin.auth.admin.createUser({
      email: `masuno-${n.toLowerCase()}-${Date.now()}@prueba.aro.club`,
      email_confirm: true,
    })
    if (error || !data.user) throw new Error('no se creó ' + n + ': ' + error?.message)
    const id = data.user.id
    ids.push(id)
    const { error: ep } = await admin.from('profiles').insert({
      id, full_name: n + ' Prueba', display_name: n, email: data.user.email, contact_email: data.user.email,
      city_slug: 'caracas', gender: genero, birthdate: '1991-03-14', status: verificada ? 'active' : 'pending_verification',
      locale: 'es-VE', phone_e164: '+5841255502' + String(k).padStart(2, '0'), es_prueba: true,
    } as never)
    if (ep) throw new Error('perfil de ' + n + ': ' + ep.message)
    const { error: ea } = await admin.from('answers').insert(respuestasDe(id) as never)
    if (ea) throw new Error('respuestas de ' + n + ': ' + ea.message)
    await admin.rpc('refrescar_rasgos' as never, { p_profile_id: id } as never)
    if (verificada) await aprobar(id)
  }
  const [ana, beto, cata, dani, eli, fer, gabi, hugo] = ids

  // La fecha: +1, dentro de tres días, cierra en dos. Dos créditos y el
  // doble del precio, como la abre el panel.
  const en = (h: number) => new Date(Date.now() + h * 3600_000).toISOString()
  const { data: ev, error: ee } = await admin
    .from('events')
    .insert({
      format: 'dinner', starts_at: en(72), booking_closes_at: en(48), reveal_at: en(65), status: 'open',
      price_usd: 20, credit_cost: 2, seats_per_table: 6, mas_uno: true, city_slug: 'caracas', es_prueba: true,
    } as never)
    .select('id')
    .single()
  if (ee || !ev) throw new Error('fecha: ' + ee?.message)
  eventoId = ev.id
  await admin.from('event_venues').insert({ event_id: eventoId, zone_slug: 'chacao' } as never)

  /** Reservar como lo hace `/api/reservar`: la reserva, el cargo de dos y sus zonas. */
  const reservar = async (quien: string) => {
    await admin.from('credit_ledger').insert({ profile_id: quien, delta: 2, reason: 'goodwill', note: 'Prueba del +1' } as never)
    const { data: b, error } = await admin
      .from('bookings')
      .insert({ event_id: eventoId, profile_id: quien, status: 'confirmed', confirmed_at: new Date().toISOString() } as never)
      .select('id')
      .single()
    if (error || !b) throw new Error('reserva: ' + error?.message)
    await admin.from('credit_ledger').insert({ profile_id: quien, delta: -2, reason: 'event_charge', booking_id: b.id } as never)
    await admin.from('booking_zones').insert({ booking_id: b.id, zone_slug: 'chacao' } as never)
    return b.id as string
  }
  const correos = async (tipo: string, quien?: string) => {
    let q = admin.from('scheduled_emails').select('profile_id, payload').eq('kind', tipo as never).in('profile_id', ids)
    if (quien) q = q.eq('profile_id', quien)
    return (await q).data ?? []
  }
  const saldo = async (quien: string) =>
    Number((await admin.from('v_credit_balance').select('balance').eq('profile_id', quien).maybeSingle()).data?.balance ?? 0)

  console.log('1 · la casilla')
  ver('sin marcarla, una fecha +1 no aparta puesto', M.faltanCondiciones({ mas_uno: true }, undefined)?.motivo === M.MOTIVO_SIN_CONDICIONES)
  ver('marcada, sí', M.faltanCondiciones({ mas_uno: true }, true) === null)
  ver('en una fecha normal no se pide', M.faltanCondiciones({ mas_uno: false }, undefined) === null)

  console.log('2 · el enlace y la primera aprobación')
  const deAna = await reservar(ana)
  const m0 = await M.masUnoDe(admin, deAna)
  ver('Ana: sin usar, con enlace y mensaje', m0?.estado === 'sin-usar' && !!m0.enlace && !!m0.mensaje?.includes(m0.enlace), m0)
  ver('el plazo se dice en palabras', !!m0?.plazo && /\d a (las|medianoche)/.test(m0.plazo), m0?.plazo)
  const i0 = await M.invitacionViva(admin, deAna)
  ver('pedirlo otra vez da el mismo enlace', !!i0 && m0?.enlace === M.enlaceDe(i0.token))
  const token1 = i0!.token
  ver('lo abre alguien sin sesión: válido', (await M.leerInvitacion(admin, token1, null))?.estado === 'valida')
  ver('lo abre Ana: es suyo', (await M.leerInvitacion(admin, token1, ana))?.estado === 'propia')
  ver('Ana no puede aceptarse a sí misma', (await M.aceptarInvitacion(admin, token1, ana)).estado === 'propia')
  ver('Beto, sin verificar, se une', (await M.aceptarInvitacion(admin, token1, beto)).estado === 'aceptada')
  ver('Cata, sin verificar, también', (await M.aceptarInvitacion(admin, token1, cata)).estado === 'aceptada')
  const m1 = await M.masUnoDe(admin, deAna)
  ver('Ana: alguien se registró', m1?.estado === 'registrado' && (m1.nombre === 'Cata' || m1.nombre === 'Beto'), m1)
  const enCola = await M.masUnoEnLaCola(admin, [beto, cata])
  ver('en la cola de verificación los dos van marcados como +1', enCola.size === 2 && enCola.get(beto)?.invita === 'Ana', [...enCola])

  // Se aprueba primero Cata.
  await aprobar(cata)
  await admin.from('profiles').update({ status: 'active' } as never).eq('id', cata)
  ver('al aprobar a Cata, el puesto es suyo', await M.reclamarPuesto(admin, cata))
  const m2 = await M.masUnoDe(admin, deAna)
  ver('Ana: Cata viene contigo', m2?.estado === 'confirmado' && m2.nombre === 'Cata', m2)
  const deCata = (await admin.from('bookings').select('id, mas_uno_de, status').eq('event_id', eventoId).eq('profile_id', cata).single()).data
  ver('Cata tiene su reserva, atada a la de Ana', deCata?.mas_uno_de === deAna && deCata.status === 'confirmed', deCata)
  ver('y no le costó nada', (await M.creditosDeLaReserva(admin, deCata!.id)) === 0)
  ver('Cata ve con quién viene', (await M.vienesConDe(admin, deCata!.id)) === 'Ana')
  ver('Ana recibe «Cata viene contigo»', (await correos('mas_uno_confirmado', ana)).length === 1)
  const invitada = (await admin.from('profiles').select('invitado_por').eq('id', cata).single()).data
  ver('Cata cuenta como referida de Ana', invitada?.invitado_por === ana, invitada)

  await aprobar(beto)
  await admin.from('profiles').update({ status: 'active' } as never).eq('id', beto)
  ver('aprobar después a Beto ya no le da puesto', !(await M.reclamarPuesto(admin, beto)))
  ver('Beto ve «Esta invitación ya se usó»', (await M.leerInvitacion(admin, token1, beto))?.estado === 'usada')
  ver('Cata la ve como suya', (await M.leerInvitacion(admin, token1, cata))?.estado === 'tuya')

  console.log('3 · cambiar de acompañante y bajarse')
  ver('Beto no puede cambiar el acompañante de Ana', (await M.cambiarAcompanante(admin, deAna, beto)) === 'no-es-tuya')
  ver('Ana cambia de acompañante', (await M.cambiarAcompanante(admin, deAna, ana)) === 'ok')
  const cataDespues = (await admin.from('bookings').select('status').eq('id', deCata!.id).single()).data
  ver('Cata queda fuera', cataDespues?.status === 'cancelled_by_ops', cataDespues)
  ver('y se entera', (await correos('mas_uno_sin_puesto', cata)).length === 1)
  ver('el enlace viejo ya no vale', (await M.leerInvitacion(admin, token1, null))?.estado === 'usada' || (await M.leerInvitacion(admin, token1, null))?.estado === 'anulada')
  const m3 = await M.masUnoDe(admin, deAna)
  ver('Ana: sin usar otra vez, con otro enlace', m3?.estado === 'sin-usar' && m3.enlace !== m0?.enlace, m3)
  const token2 = (await M.invitacionViva(admin, deAna))!.token
  ver('Beto, ya verificado, entra al instante', (await M.aceptarInvitacion(admin, token2, beto)).estado === 'confirmada')
  ver('Ana: Beto viene contigo', (await M.masUnoDe(admin, deAna))?.nombre === 'Beto')

  const deBeto = (await admin.from('bookings').select('id').eq('event_id', eventoId).eq('profile_id', beto).single()).data!.id
  await admin.from('bookings').update({ status: 'cancelled_by_user', cancelled_at: new Date().toISOString() } as never).eq('id', deBeto)
  await M.seBajoElAcompanante(admin, deBeto)
  const m4 = await M.masUnoDe(admin, deAna)
  ver('Beto se baja: Ana vuelve a «sin usar» con enlace nuevo', m4?.estado === 'sin-usar' && m4.enlace !== M.enlaceDe(token2), m4)
  ver('y Ana se entera', (await correos('mas_uno_se_bajo', ana)).length === 1)
  const token3 = (await M.invitacionViva(admin, deAna))!.token
  ver('Beto vuelve por el enlace nuevo', (await M.aceptarInvitacion(admin, token3, beto)).estado === 'confirmada')
  ver('con su misma reserva revivida', (await admin.from('bookings').select('status, mas_uno_de').eq('id', deBeto).single()).data?.mas_uno_de === deAna)

  console.log('4 · el reparto, de dos en dos')
  const deDani = await reservar(dani)
  const deFer = await reservar(fer)
  const deHugo = await reservar(hugo)
  ver('Eli entra con Dani', (await M.aceptarInvitacion(admin, (await M.invitacionViva(admin, deDani))!.token, eli)).estado === 'confirmada')
  ver('Gabi entra con Fer', (await M.aceptarInvitacion(admin, (await M.invitacionViva(admin, deFer))!.token, gabi)).estado === 'confirmada')
  ver('Hugo no puede ir con quien ya viene con otra persona', (await M.aceptarInvitacion(admin, (await M.invitacionViva(admin, deHugo))!.token, eli)).estado === 'ya-va')
  const pool = await construirPool(admin as never, eventoId)
  ver('el pool sabe que es +1', pool.masUno)
  ver('y quién viene con quién', pool.personas.find((p) => p.profileId === ana)?.pareja === beto)
  const r = repartir(pool.personas, pool.porMesa, undefined, false, pool.masUno)
  const mesa = r.mesas[0] ?? []
  const juntos = (a: string, b: string) => mesa.some((p) => p.profileId === a) && mesa.some((p) => p.profileId === b)
  ver('una mesa de seis', r.mesas.length === 1 && mesa.length === 6, r.mesas.map((m) => m.map((p) => p.nombre)))
  ver('con los tres dúos juntos', juntos(ana, beto) && juntos(dani, eli) && juntos(fer, gabi))
  ver('y Hugo, sin acompañante, fuera', r.espera.some((p) => p.profileId === hugo) && !mesa.some((p) => p.profileId === hugo))

  console.log('5 · el aviso del día antes y el cierre')
  ver('a dos días del cierre todavía no se avisa a nadie de esta fecha', !(await M.recordarAntesDelCierre(admin, true)).some((p) => p.eventoId === eventoId))
  await admin.from('events').update({ booking_closes_at: en(20) } as never).eq('id', eventoId)
  const aAvisar = (await M.recordarAntesDelCierre(admin, true)).filter((p) => p.eventoId === eventoId)
  ver('a veinte horas, solo a Hugo', aAvisar.length === 1 && aAvisar[0].perfilId === hugo, aAvisar)
  // De verdad, pero solo lo de ESTA fecha: el repaso entero tocaría fechas
  // reales. `recordarAntesDelCierre` mira todas, así que se encola a mano lo
  // mismo que encolaría, y se comprueba que no se repite.
  const { encolar } = await import('../src/lib/correos')
  await encolar({ perfil: hugo }, 'mas_uno_recordatorio', { bookingId: deHugo }, { eventoId })
  ver('una vez avisado, ya no vuelve a salir', !(await M.recordarAntesDelCierre(admin, true)).some((p) => p.eventoId === eventoId))

  await admin.from('events').update({ booking_closes_at: en(-1) } as never).eq('id', eventoId)
  const aCerrar = (await M.cerrarSinAcompanante(admin, true)).filter((p) => p.eventoId === eventoId)
  ver('al cierre, en seco: solo Hugo', aCerrar.length === 1 && aCerrar[0].perfilId === hugo, aCerrar)
  const antes = await saldo(hugo)
  // El cierre de verdad, con la misma pieza que el cron, y solo si no hay
  // ninguna reserva real que cerrar a la vez: esta prueba no toca a nadie.
  const ajenas = (await M.cerrarSinAcompanante(admin, true)).filter((p) => p.eventoId !== eventoId)
  if (ajenas.length) throw new Error('hay reservas reales sin acompañante al cierre; no se corre el cierre de verdad')
  await M.cerrarSinAcompanante(admin, false)
  const deHugoDespues = (await admin.from('bookings').select('status, cancel_reason').eq('id', deHugo).single()).data
  ver('a Hugo se le cancela la reserva', deHugoDespues?.status === 'cancelled_by_ops' && deHugoDespues.cancel_reason === M.MOTIVO_SIN_ACOMPANANTE, deHugoDespues)
  ver('y vuelven dos créditos', (await saldo(hugo)) - antes === 2, { antes, despues: await saldo(hugo) })
  ver('y se entera', (await correos('mas_uno_cancelada', hugo)).length === 1)
  ver('su Mi mesa lo cuenta', (await M.masUnoCanceladoDe(admin, hugo))?.estado === 'cancelada')
  ver('los demás siguen dentro', (await admin.from('bookings').select('status').eq('id', deAna).single()).data?.status === 'confirmed')

  console.log('6 · lo que devuelve cancelar')
  ver('la reserva de Ana costó dos', (await M.creditosDeLaReserva(admin, deAna)) === 2)
  ver('la de Beto, nada', (await M.creditosDeLaReserva(admin, deBeto)) === 0)
  await M.soltarAcompanante(admin, deFer, 'cancelo-quien-invito')
  ver('si cancela Fer, Gabi sale con él', (await admin.from('bookings').select('status').eq('event_id', eventoId).eq('profile_id', gabi).single()).data?.status === 'cancelled_by_ops')

  console.log('7 · los correos se componen')
  const payloads: [string, Record<string, unknown>][] = [
    ['mas_uno_recordatorio', { bookingId: deDani }],
    ['mas_uno_confirmado', { bookingId: deAna }],
    ['mas_uno_se_bajo', { bookingId: deAna, quien: beto }],
    ['mas_uno_cancelada', { bookingId: deHugo }],
    ['mas_uno_sin_puesto', { motivo: 'cambio', deReserva: deAna }],
  ]
  // El recordatorio solo sale si todavía falta el acompañante: Dani ya lo
  // tiene, así que se comprueba que NO sale, y se compone con uno que sí.
  ver('el recordatorio no sale si ya está confirmado', 'error' in (await M.datosDeCorreoMasUno(admin, 'mas_uno_recordatorio', eventoId, { bookingId: deDani })))
  // Fer sigue con su reserva y ya sin acompañante: a él sí le toca.
  await admin.from('events').update({ booking_closes_at: en(20) } as never).eq('id', eventoId)
  payloads[0] = ['mas_uno_recordatorio', { bookingId: deFer }]
  for (const [tipo, p] of payloads) {
    const d = await M.datosDeCorreoMasUno(admin, tipo as never, eventoId, p)
    if ('error' in d) { ver(tipo, false, d); continue }
    const pintado = await componer(tipo as never, { ...d, enlaceAjustes: 'https://aro.club/ajustes' })
    const sueltos = pintado?.html.match(/\{\{[^}]*\}\}/g)
    ver(`${tipo}: «${pintado?.asunto}» · push «${d.push.titulo}»`, !!pintado && !sueltos, sueltos)
  }

} catch (e) {
  console.error(e)
  fallos++
} finally {
  // Todo fuera, falle lo que falle.
  if (ids.length) await admin.from('scheduled_emails').delete().in('profile_id', ids)
  if (eventoId) {
    const { data: reservas } = await admin.from('bookings').select('id').eq('event_id', eventoId)
    const rids = (reservas ?? []).map((b) => b.id)
    if (rids.length) {
      await admin.from('credit_ledger').delete().in('booking_id', rids)
      await admin.from('mas_uno_invitaciones').delete().in('booking_id', rids)
      await admin.from('booking_zones').delete().in('booking_id', rids)
      await admin.from('bookings').update({ mas_uno_de: null } as never).in('id', rids)
    }
    await admin.from('bookings').delete().eq('event_id', eventoId)
    await admin.from('event_venues').delete().eq('event_id', eventoId)
    await admin.from('events').delete().eq('id', eventoId)
  }
  for (const id of ids) {
    await admin.from('credit_ledger').delete().eq('profile_id', id)
    await admin.from('verifications').delete().eq('profile_id', id)
    await admin.from('answers').delete().eq('profile_id', id)
    await admin.from('profile_traits').delete().eq('profile_id', id)
    await admin.from('profiles').update({ invitado_por: null } as never).eq('invitado_por', id)
  }
  for (const id of ids) {
    await admin.from('profiles').delete().eq('id', id)
    await admin.auth.admin.deleteUser(id)
  }
  console.log(`\n${fallos ? fallos + ' FALLOS' : 'todo bien'} · limpio`)
  process.exit(fallos ? 1 : 0)
}
