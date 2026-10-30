/**
 * Mover a alguien a una mesa YA PUBLICADA, desde la terminal.
 *
 * Michael, 30-10, con la cena a tres horas: «mueve a Kevin de la mesa hasta
 * 44 de mañana a la Mesa 01 · Poke212 de hoy» y «mueve a Abel de Poke212 a
 * L'entrecote 212». El panel no sabe hacer ninguno de los dos:
 *
 *  - `/api/operacion/mover-fecha` solo admite destinos `open` o `locked`, y
 *    una fecha ya repartida está en `matched`. Y aunque lo admitiera, deja a
 *    la persona sin mesa: no sienta a nadie en una mesa publicada.
 *  - `/api/operacion/publicar` se niega a republicar una mesa ya publicada,
 *    así que mover a alguien ENTRE dos mesas publicadas obligaría a
 *    despublicar las dos y volver a publicarlas, con trece personas de por
 *    medio y sus correos.
 *
 * Esto hace lo mínimo y nada más: la fila de `table_members`, la propuesta
 * guardada para que el panel diga la verdad, y el correo de quien se mueve.
 * A nadie más se le toca ni se le escribe.
 *
 *   node scripts/mover-de-mesa.mjs                       el tablero de hoy y mañana
 *   node scripts/mover-de-mesa.mjs <quien> <local>       en seco, sin escribir nada
 *   node scripts/mover-de-mesa.mjs <quien> <local> aplicar
 *
 *   --porque="..."   el motivo que lee quien se mueve de mesa. Vacío, el
 *                    correo se manda sin esa línea.
 *   --forzar         mover igual aunque no encaje por edad o por idioma.
 *
 * `<quien>` es un correo o un nombre, y si cuadra con más de una persona se
 * para y las lista: hay dos Kevin. `<local>` es parte del nombre del
 * restaurante de la mesa de destino.
 *
 * LO QUE NO HACE, A PROPÓSITO:
 *
 *  - No recalcula el resumen de las mesas. Lo que sale en el panel por cada
 *    mesa —el balance, los tramos, «nadie repetido»— lo escribió el reparto,
 *    y rehacerlo aquí sería escribir el reparto por segunda vez. Las dos
 *    mesas tocadas se quedan con su resumen viejo hasta el próximo reparto;
 *    el aviso lo dice al terminar.
 *  - No cobra, no devuelve y no toca el crédito. La reserva es la MISMA fila
 *    con otra fecha, igual que `moverReserva`: el pago viaja con ella.
 *  - No manda el correo por su cuenta. Lo deja en la cola y sale en la
 *    próxima vuelta del cron, como cualquier otro, en menos de un cuarto de
 *    hora.
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url).pathname, 'utf8')
    .split('\n').filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } })

const CARACAS = 4
const car = (s) => (s
  ? new Date(new Date(s).getTime() - CARACAS * 3600e3).toISOString().slice(0, 16).replace('T', ' ')
  : '—')
/** Las que ocupan sitio. Una cancelada no ocupa nada. */
const VIVAS = ['pending_payment', 'confirmed']
const dosDigitos = (n) => String(n).padStart(2, '0')
const para = () => process.exit(1)

const args = process.argv.slice(2)
const banderas = args.filter((a) => a.startsWith('--'))
const sueltos = args.filter((a) => !a.startsWith('--'))
const porque = (banderas.find((b) => b.startsWith('--porque=')) ?? '').slice(9).replace(/^["']|["']$/g, '').trim()
const forzar = banderas.includes('--forzar')
const aplicar = sueltos[2] === 'aplicar'

// --- el tablero -------------------------------------------------------
//
// Solo fechas que no han empezado: mover a alguien a una cena de anteayer no
// es una operación, es un error de dedo.
const ahora = new Date().toISOString()
const { data: fechas, error: eF } = await admin
  .from('events')
  .select('id, status, format, starts_at, reveal_at, price_usd, age_band_min, age_band_max, idioma, es_prueba, seats_per_table')
  .eq('es_prueba', false)
  .gt('starts_at', ahora)
  .order('starts_at')
if (eF) { console.log('No se pudieron leer las fechas: ' + eF.message); para() }

const idsFecha = fechas.map((f) => f.id)
const { data: mesas } = await admin
  .from('dinner_tables')
  .select('id, event_id, table_number, restaurant_id, run_id')
  .in('event_id', idsFecha)
  .order('table_number')
const { data: locales } = await admin.from('restaurants').select('id, name')
const nombreLocal = (id) => (locales ?? []).find((l) => l.id === id)?.name ?? '(sin sitio)'

const { data: sentados } = await admin
  .from('table_members')
  .select('table_id, profile_id, booking_id, seat_order')
  .in('table_id', (mesas ?? []).map((m) => m.id))

const { data: reservas } = await admin
  .from('bookings')
  .select('id, event_id, profile_id, status, movida_de')
  .in('event_id', idsFecha)
  .in('status', VIVAS)

const quienes = [...new Set([
  ...(sentados ?? []).map((s) => s.profile_id),
  ...(reservas ?? []).map((r) => r.profile_id),
])]
const { data: perfiles } = await admin
  .from('profiles')
  .select('id, display_name, full_name, email, birthdate')
  .in('id', quienes.length ? quienes : ['00000000-0000-0000-0000-000000000000'])
const perfil = (id) => (perfiles ?? []).find((p) => p.id === id) ?? null
const nombre = (id) => { const p = perfil(id); return p?.display_name || p?.full_name || '?' }

function tablero() {
  for (const f of fechas) {
    const suyas = (mesas ?? []).filter((m) => m.event_id === f.id)
    const apuntadas = (reservas ?? []).filter((r) => r.event_id === f.id)
    console.log('\n' + car(f.starts_at) + '  ' + f.format + '  ' + f.status
      + (f.age_band_min || f.age_band_max ? '  banda ' + (f.age_band_min ?? '') + '-' + (f.age_band_max ?? '') : '')
      + '  ' + apuntadas.length + ' apuntadas  ' + f.id.slice(0, 8))
    if (!suyas.length) { console.log('   sin mesas publicadas'); continue }
    for (const m of suyas) {
      const gente = (sentados ?? []).filter((s) => s.table_id === m.id).sort((a, b) => a.seat_order - b.seat_order)
      console.log('   Mesa ' + dosDigitos(m.table_number) + ' · ' + nombreLocal(m.restaurant_id)
        + '  (' + gente.length + ')  ' + gente.map((g) => nombre(g.profile_id)).join(', '))
    }
  }
}

if (sueltos.length < 2) {
  tablero()
  console.log('\n(en seco: `node scripts/mover-de-mesa.mjs <quien> <local>` para ver un movimiento)')
  process.exit(0)
}

// --- a quién ----------------------------------------------------------
//
// Por correo o por nombre, y si cuadra con más de uno se para. Hay dos
// Kevin: elegir «el primero» sería mover a la persona equivocada en la única
// acción del día que le cambia el restaurante a alguien.
const busca = sueltos[0].trim().toLowerCase()
const candidatas = (perfiles ?? []).filter((p) =>
  String(p.email ?? '').toLowerCase() === busca
  || String(p.email ?? '').toLowerCase().includes(busca)
  || String(p.display_name ?? '').toLowerCase().includes(busca)
  || String(p.full_name ?? '').toLowerCase().includes(busca))

if (!candidatas.length) {
  console.log('Nadie con reserva viva en las fechas que vienen cuadra con «' + sueltos[0] + '».')
  para()
}
// Un correo exacto gana siempre: es lo único que no se repite.
const exacta = candidatas.find((p) => String(p.email ?? '').toLowerCase() === busca)
if (!exacta && candidatas.length > 1) {
  console.log('«' + sueltos[0] + '» cuadra con ' + candidatas.length + ' personas. Dime el correo:')
  for (const c of candidatas) console.log('  ' + (c.display_name || c.full_name) + '  ' + c.email)
  para()
}
const quien = exacta ?? candidatas[0]

// --- a qué mesa -------------------------------------------------------
const buscaLocal = sueltos[1].trim().toLowerCase()
const mesasQueCuadran = (mesas ?? []).filter((m) =>
  nombreLocal(m.restaurant_id).toLowerCase().includes(buscaLocal))

if (!mesasQueCuadran.length) {
  console.log('Ninguna mesa publicada está en un sitio que cuadre con «' + sueltos[1] + '».')
  tablero()
  para()
}
if (mesasQueCuadran.length > 1) {
  console.log('«' + sueltos[1] + '» cuadra con ' + mesasQueCuadran.length + ' mesas publicadas:')
  for (const m of mesasQueCuadran) {
    const f = fechas.find((x) => x.id === m.event_id)
    console.log('  ' + car(f?.starts_at) + '  Mesa ' + dosDigitos(m.table_number) + ' · ' + nombreLocal(m.restaurant_id))
  }
  para()
}
const mesa = mesasQueCuadran[0]
const destino = fechas.find((f) => f.id === mesa.event_id)

// --- de dónde sale ----------------------------------------------------
const suya = (reservas ?? []).find((r) => r.profile_id === quien.id)
if (!suya) {
  console.log(nombre(quien.id) + ' no tiene reserva viva en ninguna fecha que venga.')
  para()
}
const origen = fechas.find((f) => f.id === suya.event_id)
const dondeEsta = (sentados ?? []).find((s) => s.profile_id === quien.id)
const mesaDeAhora = dondeEsta ? (mesas ?? []).find((m) => m.id === dondeEsta.table_id) : null

if (mesaDeAhora && mesaDeAhora.id === mesa.id) {
  console.log(nombre(quien.id) + ' ya está en esa mesa.')
  para()
}

const cambiaDeFecha = suya.event_id !== destino.id

console.log('\n' + nombre(quien.id) + '  ' + quien.email)
console.log('  reserva  ' + suya.status + '  ' + car(origen.starts_at)
  + (mesaDeAhora ? '  Mesa ' + dosDigitos(mesaDeAhora.table_number) + ' · ' + nombreLocal(mesaDeAhora.restaurant_id) : '  sin mesa publicada'))
console.log('  se va a  ' + car(destino.starts_at) + '  Mesa ' + dosDigitos(mesa.table_number) + ' · ' + nombreLocal(mesa.restaurant_id))

// --- los candados -----------------------------------------------------
//
// Los mismos que `moverReserva`, y por el mismo motivo: lo pagado viaja con
// la fila y nadie recalcula nada, así que mover a una fecha de otro precio
// deja a esa persona dentro habiendo pagado de menos o de más.
if (cambiaDeFecha) {
  if (Number(origen.price_usd ?? 0) !== Number(destino.price_usd ?? 0)) {
    console.log('\nNO: esa fecha vale ' + destino.price_usd + ' y la suya ' + origen.price_usd + ', y lo pagado viaja con la reserva.')
    para()
  }
  const yaEnDestino = (reservas ?? []).find((r) => r.profile_id === quien.id && r.event_id === destino.id)
  if (yaEnDestino) {
    console.log('\nNO: ya tiene una reserva viva en la fecha de destino.')
    para()
  }
  // La edad, como en el panel: pregunta, no candado. Pero no se pasa sin
  // querer.
  const anos = quien.birthdate
    ? Math.floor((Date.parse(destino.starts_at) - Date.parse(quien.birthdate)) / (365.25 * 24 * 3600e3))
    : null
  const fuera = anos == null
    || (destino.age_band_min != null && anos < destino.age_band_min)
    || (destino.age_band_max != null && anos > destino.age_band_max)
  if (fuera) {
    console.log('\n' + (anos == null ? 'Sin fecha de nacimiento' : 'Tiene ' + anos + ' años')
      + ' y esa cena es de ' + (destino.age_band_min ?? '') + ' a ' + (destino.age_band_max ?? '') + '.')
    if (!forzar) { console.log('Si va igual: añade --forzar.'); para() }
    console.log('Se mueve igual porque lo pediste con --forzar.')
  }
}

// --- qué correo le toca -----------------------------------------------
//
// Dentro de la misma fecha es `mesa_cambiada`, que se compone al enviar
// leyendo `table_members`: dice «antes era X» con lo que de verdad se le
// dijo, y eso solo vive en el payload del correo que ya salió.
//
// Cambiando de fecha es `mesa_asignada`, el de siempre: en la fecha nueva no
// se le ha dicho nada, así que no hay nada que corregir.
const { data: loSuyo } = await admin
  .from('scheduled_emails')
  .select('id, kind, event_id, send_at, sent_at, payload')
  .eq('profile_id', quien.id)
  .in('event_id', [origen.id, destino.id])

// Lo ÚLTIMO que se le dijo, que es contra lo que hay que comparar: si ya
// hubo un cambio antes, el «antes era» tiene que decir lo del cambio y no lo
// de la revelación, que esa persona ya sabe que quedó vieja.
const dichos = (loSuyo ?? []).filter((r) =>
  r.event_id === destino.id && ['mesa_asignada', 'mesa_cambiada'].includes(r.kind) && r.sent_at)
const yaLeDijimos = dichos.find((r) => r.kind === 'mesa_cambiada')
  ?? dichos.find((r) => r.kind === 'mesa_asignada')
  ?? null
const yaLeCambiamos = (loSuyo ?? []).some((r) =>
  r.event_id === destino.id && r.kind === 'mesa_cambiada' && r.sent_at)

let correo = null
if (yaLeCambiamos) {
  console.log('\nOJO: ya se le mandó un «cambió tu mesa» de esta fecha, y solo cabe uno por persona y fecha.')
  console.log('Se le mueve igual, pero hay que escribirle A MANO: ' + quien.email)
} else if (yaLeDijimos) {
  const pl = yaLeDijimos.payload ?? {}
  correo = {
    kind: 'mesa_cambiada',
    event_id: destino.id,
    send_at: new Date().toISOString(),
    payload: {
      antesMesa: pl.mesa == null ? null : String(pl.mesa),
      antesSitio: pl.sitio == null ? null : String(pl.sitio),
      porque: porque || null,
    },
  }
  console.log('\nCorreo: «cambió tu mesa», ya (su revelación salió el ' + car(yaLeDijimos.sent_at) + ').')
  console.log('  antes decía: mesa ' + String(correo.payload.antesMesa) + ' en ' + String(correo.payload.antesSitio))
  if (!porque) console.log('  sin motivo: el correo sale sin esa línea. Con --porque="..." se la pones.')
} else {
  // Sin revelación todavía, el correo normal a su hora. Si ya pasó, ya: la
  // cena es hoy y esperar sería avisarle cuando no le da tiempo.
  const revela = Date.parse(destino.reveal_at)
  correo = {
    kind: 'mesa_asignada',
    event_id: destino.id,
    send_at: revela > Date.now() ? destino.reveal_at : new Date().toISOString(),
    payload: { mesa: mesa.table_number, sitio: nombreLocal(mesa.restaurant_id), formato: destino.format },
  }
  console.log('\nCorreo: «tu mesa», ' + (revela > Date.now() ? 'a la hora de la revelación (' + car(destino.reveal_at) + ')' : 'ya'))
}

// Y el del juego, si sus compañeros de mesa lo tienen en cola. Sin esto se
// sienta en una mesa que juega y él es el único que no recibió el mazo.
const companeros = (sentados ?? []).filter((s) => s.table_id === mesa.id).map((s) => s.profile_id)
const { data: juegos } = companeros.length
  ? await admin.from('scheduled_emails')
    .select('send_at, payload, sent_at')
    .eq('event_id', destino.id).eq('kind', 'juego')
    .in('profile_id', companeros)
    .is('sent_at', null)
    .limit(1)
  : { data: [] }
/**
 * Y si ya tenía uno en cola de esta fecha, se CORRIGE, no se añade otro.
 *
 * `scheduled_emails` es único por (persona, tipo, fecha) para los que
 * anuncian una vez, así que un segundo `juego` chocaría; y si no chocara
 * sería peor: dos mazos distintos para la misma cena. Quien se mueve de mesa
 * dentro de la misma noche ya tiene el suyo, apuntando a la mesa que deja.
 */
const suJuego = (loSuyo ?? []).find((r) => r.event_id === destino.id && r.kind === 'juego' && !r.sent_at) ?? null
const juego = suJuego
  ? { corregir: suJuego.id, kind: 'juego', event_id: destino.id, send_at: suJuego.send_at, payload: { mesaId: mesa.id } }
  : (juegos ?? [])[0]
    ? { kind: 'juego', event_id: destino.id, send_at: (juegos ?? [])[0].send_at, payload: { mesaId: mesa.id } }
    : null
if (juego) {
  console.log('Correo: el juego de la mesa, con los demás (' + car(juego.send_at) + ')'
    + (juego.corregir ? ', corrigiendo el mazo del que ya tenía en cola.' : '.'))
}

// Y lo que ya no es verdad: lo que tenía en cola de la fecha que deja.
const porRetirar = cambiaDeFecha
  ? (loSuyo ?? []).filter((r) => r.event_id === origen.id && !r.sent_at
    && ['mesa_asignada', 'mesa_cambiada', 'recordatorio', 'juego', 'sin_mesa'].includes(r.kind))
  : []
if (porRetirar.length) {
  console.log('Se le retiran de la cola de la fecha que deja: ' + porRetirar.map((r) => r.kind).join(', '))
}

// --- el asiento -------------------------------------------------------
const ocupados = new Set((sentados ?? []).filter((s) => s.table_id === mesa.id).map((s) => s.seat_order))
let asiento = 1
while (ocupados.has(asiento)) asiento++
const cuantos = ocupados.size + 1
console.log('\nLa mesa queda en ' + cuantos + (cuantos > destino.seats_per_table ? ' (de ' + destino.seats_per_table + ': va por encima)' : ''))

if (!aplicar) {
  console.log('\n(en seco: no se ha escrito nada. Añade `aplicar` al final)')
  process.exit(0)
}

// ======================================================================
// A ESCRIBIR. De lo que no se pierde a lo que sí.
//
// Primero la reserva, que es lo que da derecho al puesto, y después el
// asiento. Al revés, un fallo por el camino lo sienta en una mesa de una
// fecha en la que no está apuntado.
// ======================================================================
if (cambiaDeFecha) {
  const vuelveACasa = suya.movida_de === destino.id
  const { error } = await admin.from('bookings').update({
    event_id: destino.id,
    movida_de: vuelveACasa ? null : (suya.movida_de ?? origen.id),
    movida_at: vuelveACasa ? null : new Date().toISOString(),
    // A mano y desde la terminal: no hay sesión de operación que firmar.
    movida_por: null,
  }).eq('id', suya.id)
  if (error) { console.log('ERROR moviendo la reserva: ' + error.message); para() }
  console.log('reserva movida a ' + car(destino.starts_at))

  // Fuera de la propuesta que deja, que si no lo sigue pintando sentado en
  // una fecha en la que ya no está.
  const { data: corridas } = await admin.from('matching_runs')
    .select('id, proposal, unmatched').eq('event_id', origen.id)
    .order('created_at', { ascending: false }).limit(1)
  const vieja = (corridas ?? [])[0]
  if (vieja) {
    const props = (vieja.proposal ?? [])
    let salio = false
    for (const m of props) {
      if (m.publicada) continue
      const antes = (m.integrantes ?? []).length
      m.integrantes = (m.integrantes ?? []).filter((i) => i.profileId !== quien.id)
      if (m.integrantes.length !== antes) salio = true
    }
    const espera = (vieja.unmatched ?? []).filter((i) => i.profileId !== quien.id)
    const quedan = props.filter((m) => m.publicada || (m.integrantes ?? []).length > 0)
    await admin.from('matching_runs')
      .update({ proposal: quedan, unmatched: espera })
      .eq('id', vieja.id)
    console.log('propuesta de la fecha que deja: ' + (salio ? 'sacado de su mesa' : 'no estaba en ninguna mesa'))
  }

  if (porRetirar.length) {
    await admin.from('scheduled_emails').delete().in('id', porRetirar.map((r) => r.id)).is('sent_at', null)
    console.log('correos retirados: ' + porRetirar.length)
  }
}

// El asiento. Si ya estaba sentado en otra mesa de la misma fecha, se MUEVE
// la fila: borrar y crear dejaría un hueco si la segunda mitad falla.
if (dondeEsta) {
  const { error } = await admin.from('table_members')
    .update({ table_id: mesa.id, seat_order: asiento, booking_id: suya.id })
    .eq('table_id', dondeEsta.table_id).eq('profile_id', quien.id)
  if (error) { console.log('ERROR moviendo el asiento: ' + error.message); para() }
} else {
  const { error } = await admin.from('table_members')
    .insert({ table_id: mesa.id, profile_id: quien.id, booking_id: suya.id, seat_order: asiento })
  if (error) { console.log('ERROR sentándolo: ' + error.message); para() }
}
console.log('sentado en la Mesa ' + dosDigitos(mesa.table_number) + ' · ' + nombreLocal(mesa.restaurant_id) + ', asiento ' + asiento)

// Y la propuesta de la fecha de destino, que es lo que pinta el panel.
const { data: corridaDestino } = await admin.from('matching_runs')
  .select('id, proposal').eq('event_id', destino.id)
  .order('created_at', { ascending: false }).limit(1)
const nueva = (corridaDestino ?? [])[0]
if (nueva) {
  const props = (nueva.proposal ?? [])
  let ficha = null
  for (const m of props) {
    const i = (m.integrantes ?? []).findIndex((x) => x.profileId === quien.id)
    if (i >= 0) { ficha = m.integrantes[i]; m.integrantes.splice(i, 1) }
  }
  // Si venía de otra fecha, su ficha está en la propuesta de aquella. Se
  // copia tal cual: la escribió el reparto y no se inventa aquí.
  if (!ficha && cambiaDeFecha) {
    const { data: viejas } = await admin.from('matching_runs')
      .select('proposal').eq('event_id', origen.id)
      .order('created_at', { ascending: false }).limit(3)
    for (const v of viejas ?? []) {
      for (const m of (v.proposal ?? [])) {
        const x = (m.integrantes ?? []).find((y) => y.profileId === quien.id)
        if (x && !ficha) ficha = x
      }
    }
  }
  const suMesa = props.find((m) => m.numero === mesa.table_number)
  if (suMesa && ficha) {
    ficha.bookingId = suya.id
    suMesa.integrantes = [...(suMesa.integrantes ?? []), ficha]
    await admin.from('matching_runs').update({ proposal: props }).eq('id', nueva.id)
    console.log('propuesta de destino: metido en la mesa ' + dosDigitos(mesa.table_number))
  } else {
    console.log('OJO: no se pudo meter en la propuesta de destino (mesa ' + dosDigitos(mesa.table_number)
      + (ficha ? '' : ', sin ficha del reparto') + '). El panel lo pintará al volver a repartir; la mesa de verdad ya está bien.')
  }
}

// --- y el correo ------------------------------------------------------
for (const c of [correo, juego].filter(Boolean)) {
  const { error } = c.corregir
    ? await admin.from('scheduled_emails').update({ payload: c.payload }).eq('id', c.corregir).is('sent_at', null)
    : await admin.from('scheduled_emails').insert({
      profile_id: quien.id, email: quien.email, kind: c.kind,
      event_id: c.event_id, send_at: c.send_at, payload: c.payload,
    })
  if (error) {
    console.log('OJO: no se pudo encolar el ' + c.kind + ': ' + error.message)
    console.log('Hay que escribirle a mano: ' + quien.email)
  } else {
    console.log((c.corregir ? 'corregido ' : 'encolado ') + c.kind + ' para ' + car(c.send_at) + ' de Caracas')
  }
}

// Queda escrito quién se movió, aunque no haya sesión que firmarlo.
await admin.from('ops_audit_log').insert({
  actor_id: null, action: 'asiento_dado', entity: 'evento', entity_id: destino.id,
  payload: {
    aMano: 'scripts/mover-de-mesa.mjs', perfil: quien.id, reserva: suya.id,
    desdeEvento: origen.id, mesa: mesa.table_number, sitio: nombreLocal(mesa.restaurant_id),
    porque: porque || null,
  },
})

console.log('\nListo. El resumen de las mesas tocadas se queda viejo hasta el próximo reparto:')
console.log('lo que vale es quién está sentado, y eso ya está bien.')
