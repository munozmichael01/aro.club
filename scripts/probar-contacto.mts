/**
 * «Seguir en contacto» de punta a punta, contra la base, sin tocar a nadie.
 *
 *   npm_config_cache=/tmp/npmcache npx --yes tsx --conditions=react-server scripts/probar-contacto.mts
 *
 * Monta una cena de prueba ya pasada con cuatro cuentas de prueba (Ana, Beto,
 * Cata y Dani, en @prueba.aro.club: a ese dominio no sale ningún correo y sin
 * teléfono registrado no sale ninguna push) y recorre el flujo:
 *
 *   1. Ana marca a las otras tres y las tres a Ana → tres coincidencias, y Ana
 *      recibe UN aviso agrupado.
 *   2. Beto confirma; Cata dice que no, se arrepiente y confirma. Ana comparte
 *      con las tres → se cruza con Beto y Cata A LA VEZ: a Ana le llega UN
 *      correo con las dos (Michael, 31-10), y a Beto y a Cata uno cada una.
 *   3. Dani no confirma; se vence el plazo → cierre, y «No se cruzaron» solo
 *      para Ana, que había confirmado.
 *   4. Los correos se componen sin error, también el del cruce agrupado.
 *
 * Y lo borra todo al final, falle o no.
 */
import fs from 'node:fs'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const i = l.indexOf('=')
  if (i > 0 && !process.env[l.slice(0, i).trim()]) process.env[l.slice(0, i).trim()] = l.slice(i + 1).trim()
}

const { createClient } = await import('@supabase/supabase-js')
const C = await import('../src/lib/contacto')
const { componer } = await import('../src/lib/remitente')

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let fallos = 0
const ver = (que: string, ok: boolean, detalle?: unknown) => {
  console.log((ok ? '  ✓ ' : '  ✗ ') + que + (ok || detalle === undefined ? '' : ' → ' + JSON.stringify(detalle)))
  if (!ok) fallos++
}

const nombres = ['Ana', 'Beto', 'Cata', 'Dani']
const ids: string[] = []
let eventoId = ''
let mesaId = ''

try {
  for (const n of nombres) {
    const { data, error } = await admin.auth.admin.createUser({
      email: `contacto-${n.toLowerCase()}-${Date.now()}@prueba.aro.club`,
      email_confirm: true,
    })
    if (error || !data.user) throw new Error('no se creó ' + n + ': ' + error?.message)
    ids.push(data.user.id)
    // Como el banco de pruebas: el perfil no nace solo al crear el usuario.
    const { error: ep } = await admin.from('profiles').insert({
      id: data.user.id, full_name: n + ' Prueba', display_name: n, email: data.user.email, city_slug: 'caracas',
      gender: 'sin-decir', status: 'active', locale: 'es-VE', phone_e164: '+58412555012' + ids.length, es_prueba: true,
    } as never)
    if (ep) throw new Error('perfil de ' + n + ': ' + ep.message)
  }
  const [ana, beto, cata, dani] = ids

  const hace = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()
  const { data: ev, error: ee } = await admin
    .from('events')
    .insert({ format: 'dinner', starts_at: hace(30), booking_closes_at: hace(60), reveal_at: hace(36), status: 'locked', price_usd: 10, city_slug: 'caracas', es_prueba: true } as never)
    .select('id')
    .single()
  if (ee || !ev) throw new Error('fecha: ' + ee?.message)
  eventoId = ev.id
  // Un sitio cualquiera: la mesa lo pide, y en esta prueba no se enseña.
  const { data: sitio } = await admin.from('restaurants').select('id').limit(1).single()
  const { data: mesa, error: em } = await admin.from('dinner_tables').insert({ event_id: eventoId, table_number: 1, restaurant_id: sitio?.id ?? null } as never).select('id').single()
  if (em || !mesa) throw new Error('mesa: ' + em?.message)
  mesaId = mesa.id
  for (const [k, p] of ids.entries()) {
    const { data: b, error: eb } = await admin.from('bookings').insert({ profile_id: p, event_id: eventoId, status: 'attended' } as never).select('id').single()
    if (eb || !b) throw new Error('reserva: ' + eb?.message)
    await admin.from('table_members').insert({ table_id: mesaId, profile_id: p, booking_id: b.id, seat_order: k + 1 } as never)
  }
  const estadoDe = async (quien: string, de: string) => (await C.contactoDeMesa(admin, quien, mesaId))!.personas.find((p) => p.id === de)!.estado
  const correos = async (tipo: string) => (await admin.from('scheduled_emails').select('profile_id, payload').eq('kind', tipo).in('profile_id', ids)).data ?? []

  console.log('1 · las marcas')
  const marca = (de: string, a: string) => admin.from('peer_feedback').insert({ table_id: mesaId, rater_id: de, rated_id: a, signal: 'connect' } as never)
  for (const otra of [beto, cata, dani]) await marca(ana, otra)
  ver('marcas de un solo lado no crean nada', (await C.crearCoincidencias(admin, mesaId)).length === 0)
  for (const otra of [beto, cata, dani]) await marca(otra, ana)
  const nuevas = await C.crearCoincidencias(admin, mesaId)
  ver('marcas mutuas → tres coincidencias', nuevas.length === 3, nuevas.length)
  ver('repetir no crea más', (await C.crearCoincidencias(admin, mesaId)).length === 0)
  await C.avisarCoincidencias(admin, nuevas)
  const avisos = await correos('contacto_coincidencia')
  const deAna = avisos.filter((x) => x.profile_id === ana)
  ver('Ana recibe UN aviso agrupado con las tres', deAna.length === 1 && ((deAna[0].payload as { con: string[] }).con.length === 3), deAna)
  ver('las otras tres, uno cada una', avisos.length === 4, avisos.length)

  const vista = await C.contactoDeMesa(admin, ana, mesaId)
  ver('Ana las ve en A', vista!.personas.length === 3 && vista!.personas.every((p) => p.estado === 'A'))
  ver('Ana: el teléfono viene del perfil', vista!.misDatos.telefono.startsWith('+58412555012') && !vista!.misDatos.guardados)
  ver('Ana: lo de las otras no viaja antes del cruce', vista!.personas.every((p) => p.suyos === null))

  console.log('2 · compartir y cruzar')
  const malo = await C.decidir(admin, ana, mesaId, { accion: 'compartir', con: [beto], telefono: '123' })
  ver('un teléfono que no vale se rechaza', !!malo && malo.campo === 'telefono', malo)
  const igMalo = await C.decidir(admin, ana, mesaId, { accion: 'compartir', con: [beto], telefono: '04125550123', instagram: 'no vale!' })
  ver('un Instagram que no vale se rechaza', !!igMalo && igMalo.campo === 'instagram', igMalo)

  ver('Beto confirma', (await C.decidir(admin, beto, mesaId, { accion: 'compartir', con: [ana], telefono: '+584145550188', tiktok: '@beto.tt' })) === null)
  ver('para Ana, Beto sigue sin decir nada (A)', (await estadoDe(ana, beto)) === 'A')
  await C.decidir(admin, cata, mesaId, { accion: 'no' })
  ver('Cata en E', (await estadoDe(cata, ana)) === 'E')
  ver('para Ana, Cata no dice nada (A): no se entera', (await estadoDe(ana, cata)) === 'A')
  await C.decidir(admin, cata, mesaId, { accion: 'reabrir', con: [ana] })
  ver('Cata puede volver a A', (await estadoDe(cata, ana)) === 'A')
  ver('Cata confirma', (await C.decidir(admin, cata, mesaId, { accion: 'compartir', con: [ana], telefono: '04245550101' })) === null)

  ver('Ana comparte con las tres', (await C.decidir(admin, ana, mesaId, { accion: 'compartir', con: [beto, cata, dani], telefono: '0412 555 0123', instagram: 'https://instagram.com/ana.prueba/' })) === null)
  ver('Ana y Beto en C', (await estadoDe(ana, beto)) === 'C')
  ver('Ana y Cata en C', (await estadoDe(ana, cata)) === 'C')
  ver('con Dani, Ana en B', (await estadoDe(ana, dani)) === 'B')
  const delAna = (await C.contactoDeMesa(admin, ana, mesaId))!
  ver('el Instagram se guarda limpio', delAna.misDatos.instagram === 'ana.prueba', delAna.misDatos)
  ver('Ana ve lo que dejó Beto', delAna.personas.find((p) => p.id === beto)!.suyos?.tiktok === 'beto.tt')
  const cruces = await correos('contacto_cruzado')
  const cruceAna = cruces.filter((x) => x.profile_id === ana)
  ver('a Ana, UN correo con Beto y Cata a la vez', cruceAna.length === 1 && ((cruceAna[0].payload as { otras: string[] }).otras.length === 2), cruceAna)
  ver('a Beto y a Cata, uno cada una; a Dani, nada', cruces.length === 3 && !cruces.some((x) => x.profile_id === dani), cruces)

  await C.decidir(admin, dani, mesaId, { accion: 'no' })
  ver('para Ana, Dani sigue en B: no se entera de que dijo que no', (await estadoDe(ana, dani)) === 'B')

  console.log('3 · se vence el plazo')
  await admin.from('contacto_coincidencias').update({ cierra_en: hace(1) }).eq('table_id', mesaId).is('cruzada_en', null)
  const enSeco = await C.repasoDeContacto(admin, true, mesaId)
  ver('en seco cuenta el cierre', enSeco.cerradas >= 1, enSeco)
  const { data: abierta } = await admin.from('contacto_coincidencias').select('cerrada_en').eq('table_id', mesaId).is('cruzada_en', null).single()
  ver('en seco no la cerró', abierta!.cerrada_en === null)
  ver('vencida ya se ve como D', (await estadoDe(ana, dani)) === 'D')
  // SOLO su mesa: el repaso entero tocaría las coincidencias de verdad.
  await C.repasoDeContacto(admin, false, mesaId)
  const sinCruce = await correos('contacto_sin_cruce')
  ver('«No se cruzaron» solo para Ana, que confirmó', sinCruce.length === 1 && sinCruce[0].profile_id === ana, sinCruce)
  ver('Pasadas: Ana tiene algo nuevo en esa cena', !!(await C.contactoPorMesa(admin, ana)).get(mesaId)?.nuevo)
  await C.decidir(admin, ana, mesaId, { accion: 'visto' })
  ver('al abrirla se apaga', !(await C.contactoPorMesa(admin, ana)).get(mesaId)?.nuevo)

  console.log('4 · los correos se componen')
  for (const [nombre, tipo, quien, payload] of [
    ['coincidencia, tres a la vez', 'contacto_coincidencia', ana, { mesa: mesaId, con: [beto, cata, dani] }],
    ['cruce agrupado (Ana)', 'contacto_cruzado', ana, { mesa: mesaId, otras: [beto, cata] }],
    ['cruce de una (Beto)', 'contacto_cruzado', beto, { mesa: mesaId, otras: [ana] }],
    ['no se cruzaron', 'contacto_sin_cruce', ana, { mesa: mesaId, otra: dani }],
  ] as const) {
    const d = await C.datosDeCorreo(admin, tipo, quien, payload)
    if ('error' in d) { ver(nombre, false, d); continue }
    const pintado = await componer(tipo, { ...d, enlaceAjustes: 'https://aro.club/ajustes' })
    const sueltos = pintado?.html.match(/\{\{[^}]*\}\}/g)
    ver(`${nombre}: «${pintado?.asunto}»`, !!pintado && !sueltos, sueltos)
  }
} catch (e) {
  console.error(e)
  fallos++
} finally {
  // Todo fuera, falle lo que falle.
  if (ids.length) await admin.from('scheduled_emails').delete().in('profile_id', ids)
  if (mesaId) {
    await admin.from('contacto_coincidencias').delete().eq('table_id', mesaId)
    await admin.from('contacto_datos').delete().eq('table_id', mesaId)
    await admin.from('peer_feedback').delete().eq('table_id', mesaId)
    await admin.from('table_members').delete().eq('table_id', mesaId)
    await admin.from('dinner_tables').delete().eq('id', mesaId)
  }
  if (eventoId) {
    await admin.from('bookings').delete().eq('event_id', eventoId)
    await admin.from('events').delete().eq('id', eventoId)
  }
  for (const id of ids) {
    await admin.from('profiles').delete().eq('id', id)
    await admin.auth.admin.deleteUser(id)
  }
  console.log(`\n${fallos ? fallos + ' FALLOS' : 'todo bien'} · limpio`)
  process.exit(fallos ? 1 : 0)
}
