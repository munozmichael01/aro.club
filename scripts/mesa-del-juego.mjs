/**
 * Una mesa de prueba para jugar el juego AHORA, con gente de verdad.
 *
 *   node scripts/mesa-del-juego.mjs <correo> [<correo>...]
 *       Monta un sitio y una fecha de prueba que YA EMPEZÓ, apunta a esas
 *       cuentas, rellena hasta seis con acompañantes de `sembrar-mesa` y
 *       deja la fecha lista para repartir y publicar desde el panel.
 *
 *   node scripts/mesa-del-juego.mjs --empezo 40 <correo>...
 *       Lo mismo, diciendo cuántos minutos lleva empezada. Por defecto
 *       veinte, que es cuando toca la push del juego: así se encola para
 *       AHORA y no hay que esperar sentado.
 *
 *   node scripts/mesa-del-juego.mjs --pares
 *       Deshace SOLO los pares y deja la mesa en pie. Para cuando la mesa de
 *       prueba se queda como cena pasada pero no debe impedir que esa gente
 *       coincida en una cena de verdad.
 *
 *   node scripts/mesa-del-juego.mjs --borrar
 *       Desmonta: la fecha con todo lo que cuelga de ella, el sitio, los
 *       acompañantes y —esto es lo que importa— los pares.
 *
 * POR QUÉ UNA FECHA QUE YA EMPEZÓ. El juego se abre con la cena, no antes:
 * la ventana va de `starts_at` a cuatro horas después. Una fecha dentro de
 * diez minutos obliga a esperar diez minutos mirando una tarjeta apagada; una
 * que empezó hace veinte está abierta al cargar la pantalla, y además es el
 * minuto exacto en que llega la push, que es la mitad de lo que se prueba.
 *
 * POR QUÉ HAY QUE PODER DESHACER LOS PARES. Publicar una mesa dispara
 * `trg_pair_encounters`: a partir de ese insert, esas seis personas «ya se
 * vieron», y el veto de no repetir es REGLA DURA de tres meses. Dos testers
 * que prueban el juego un martes se quedan sin poder coincidir en la cena del
 * viernes, y el reparto no lo explica: simplemente no los sienta juntos. Así
 * que antes de que exista la mesa se anotan los pares que YA había entre esas
 * seis personas, y `--borrar` los repone tal cual. Decrementar el contador no
 * serviría: `last_met_at` no se recupera restando.
 *
 * LO QUE NO HACE. No reparte ni publica: eso se hace desde el panel, que es
 * el camino de verdad y el que encola la push del juego a `starts_at` + 20.
 * Un guion que escribiera las mesas a mano probaría el guion, no el producto.
 *
 * NO TOCA CRÉDITOS de las cuentas de verdad, a propósito. Una reserva de
 * prueba que cobra un crédito deja a una persona real debiendo uno si el
 * desmontaje falla a medias. La reserva basta para entrar al reparto.
 */
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
)

const BASE = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

/**
 * La tanda: qué mesa de prueba de las que puede haber a la vez.
 *
 * Son dos mesas distintas con dos rastros distintos, y hace falta porque una
 * puede quedarse puesta —como cena pasada, para mirar el flujo de después—
 * mientras otra se monta para comprobar otra cosa. Con un solo rastro, montar
 * la segunda obligaba a tirar la primera.
 *
 * La tanda es también la de `sembrar-mesa`: sus acompañantes llevan correos y
 * teléfonos propios por tanda, y las dos columnas son únicas.
 */
const args = process.argv.slice(2)
const iTanda = args.indexOf('--tanda')
const TANDA = iTanda >= 0 ? Number(args[iTanda + 1]) : 1

const SITIO = TANDA === 1 ? 'Prueba del juego' : `Prueba del juego ${TANDA}`
const iPlazas = args.indexOf('--plazas')
const PLAZAS = iPlazas >= 0 ? Number(args[iPlazas + 1]) : 6

/** Lo que creó este guion. Sin este fichero no se borra nada. */
const RASTRO = new URL(
  TANDA === 1 ? '../.mesa-del-juego.json' : `../.mesa-del-juego-${TANDA}.json`,
  import.meta.url,
).pathname

async function rest(path, opciones = {}) {
  const r = await fetch(`${BASE}/rest/v1/${path}`, { headers: H, ...opciones })
  const t = await r.text()
  if (!r.ok) throw new Error(`${path} → ${r.status} ${t}`)
  return t ? JSON.parse(t) : null
}

const crear = (tabla, cuerpo) =>
  rest(tabla, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify(cuerpo),
  })

/** Los pares entre esta gente, ahora mismo. Lo que hay que poder reponer. */
async function paresEntre(ids) {
  const lista = `(${ids.join(',')})`
  return (
    (await rest(
      `pair_encounters?profile_a=in.${lista}&profile_b=in.${lista}` +
        '&select=profile_a,profile_b,times_met,last_met_at',
    )) ?? []
  )
}

async function borrar() {
  if (!existsSync(RASTRO)) {
    console.log('Sin rastro en disco: no se toca nada.')
    return
  }
  const r = JSON.parse(readFileSync(RASTRO, 'utf8'))

  // La fecha se lleva por delante reservas, mesas, miembros, propuestas,
  // correos encolados y zonas: todo eso es `on delete cascade`.
  if (r.evento) {
    await rest(`events?id=eq.${r.evento}`, { method: 'DELETE' })
    console.log('Fecha borrada, y con ella la mesa, los apuntados y la cola.')
  }
  if (r.restaurante) {
    await rest(`restaurants?id=eq.${r.restaurante}`, { method: 'DELETE' })
    console.log(`Sitio «${SITIO}» borrado.`)
  }

  // Los pares NO cascadean: borrar la mesa no deshace «ya se vieron». Se
  // quitan todos los de entre esta gente y se repone la foto de antes.
  if (r.gente?.length) {
    const ids = r.gente.map((g) => g.id)
    const lista = `(${ids.join(',')})`
    await rest(`pair_encounters?profile_a=in.${lista}&profile_b=in.${lista}`, { method: 'DELETE' })
    if (r.pares?.length) {
      await crear('pair_encounters', r.pares)
      console.log(`Pares repuestos: ${r.pares.length} de antes de la prueba.`)
    } else {
      console.log('Pares borrados: entre esta gente no había ninguno antes.')
    }
  }

  // Los acompañantes, uno a uno y por id. NO se llama a
  // `sembrar-mesa.mjs --borrar`, que barre el dominio entero: se llevaría
  // las doce cuentas de la siembra del 29, que no son de esta prueba.
  //
  // EL ORDEN ESTÁ EXPLICADO EN `sembrar-mesa.mjs`, en su `borrar()`, y no es
  // arbitrario: `waitlist` bloquea por FK, y borrar `answers` dispara el
  // trigger que REINSERTA los rasgos, así que las respuestas van antes.
  for (const id of r.acompanantes ?? []) {
    await rest(`waitlist?converted_profile_id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ converted_profile_id: null }),
    })
    await rest(`answers?profile_id=eq.${id}`, { method: 'DELETE' })
    await rest(`profile_traits?profile_id=eq.${id}`, { method: 'DELETE' })
    await rest(`profiles?id=eq.${id}`, { method: 'DELETE' })
    const d = await fetch(`${BASE}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: H })
    if (!d.ok) throw new Error(`no se pudo borrar la cuenta ${id}: ${d.status}`)
  }
  if (r.acompanantes?.length) {
    await rest(`waitlist?email=like.*@prueba.aro.club&converted_profile_id=is.null`, {
      method: 'DELETE',
    })
    console.log(`Acompañantes borrados: ${r.acompanantes.length}.`)
  }

  unlinkSync(RASTRO)
}

/**
 * Deshacer SOLO los pares, dejando la mesa en pie.
 *
 * Hace falta porque una mesa de prueba puede querer quedarse —como cena
 * pasada, para ver el flujo de despues y que salga en el historial— y aun asi
 * no debe cobrarse el veto. Son dos cosas distintas que estaban pegadas en
 * `--borrar`: lo que la mesa CUENTA (que esta gente cenó junta, y eso se
 * quiere conservar) y lo que la mesa PROHIBE (que vuelvan a coincidir en tres
 * meses, y eso no).
 */
async function soloPares() {
  if (!existsSync(RASTRO)) {
    console.log('Sin rastro en disco: no se toca nada.')
    return
  }
  const r = JSON.parse(readFileSync(RASTRO, 'utf8'))
  if (!r.gente?.length) {
    console.log('El rastro no sabe quién se sentó: no se toca nada.')
    return
  }

  const ids = r.gente.map((g) => g.id)
  const lista = `(${ids.join(',')})`
  const antes = await paresEntre(ids)
  await rest(`pair_encounters?profile_a=in.${lista}&profile_b=in.${lista}`, { method: 'DELETE' })
  if (r.pares?.length) await crear('pair_encounters', r.pares)

  const despues = await paresEntre(ids)
  console.log(`Pares entre los ${ids.length} de la mesa: ${antes.length} → ${despues.length}`)
  console.log(r.pares?.length
    ? `   repuestos los ${r.pares.length} que había antes de la prueba`
    : '   antes de la prueba no había ninguno, así que no queda ninguno')
  console.log('\nLa mesa, las reservas y la fecha siguen en pie.')
  console.log('El veto de no repetir ya no los alcanza: el reparto puede volver a sentarlos juntos.')
}

async function montar(correos, minutosDesdeQueEmpezo) {
  if (correos.length > PLAZAS) {
    throw new Error(`en una mesa caben ${PLAZAS} y me das ${correos.length} correos`)
  }

  // --- quiénes son, y si pueden entrar al reparto ---
  const gente = []
  for (const correo of correos) {
    const [p] = await rest(
      `profiles?email=eq.${encodeURIComponent(correo)}&select=id,display_name,full_name,status,gender`,
    )
    if (!p) throw new Error(`no hay ninguna cuenta con el correo ${correo}`)
    // Sin verificar no entra al pool, y la mesa saldría de cinco. Mejor
    // saberlo aquí que delante de la pantalla.
    const vs = await rest(`verifications?profile_id=eq.${p.id}&select=status`)
    const aprobada = (vs ?? []).some((v) => v.status === 'approved')
    if (p.status !== 'active' || !aprobada) {
      throw new Error(
        `${correo} no entra al reparto: status=${p.status}, verificación=${aprobada ? 'ok' : 'sin aprobar'}`,
      )
    }
    gente.push({ id: p.id, correo, nombre: p.display_name || p.full_name, genero: p.gender })
  }

  // --- el sitio y la fecha ---
  const [sitio] = await crear('restaurants', {
    name: SITIO,
    zone_slug: 'chacao',
    address: 'Mesa de prueba. No hay cena, es para probar el juego.',
    avg_check_usd: 20,
    budget_tier: 2,
    noise_level: 2,
    max_tables: 1,
    is_active: true,
    // Sin contacto el pool descarta el sitio y la fecha se queda sin zona.
    contact_name: 'Pruebas',
    contact_phone: '+58 212 000 0000',
    formats: ['dinner'],
  })

  const empezo = new Date(Date.now() - minutosDesdeQueEmpezo * 60_000)
  const revela = new Date(empezo.getTime() - 5 * 60_000)
  const cierra = new Date(empezo.getTime() - 10 * 60_000)

  const [evento] = await crear('events', {
    format: 'dinner',
    starts_at: empezo.toISOString(),
    booking_closes_at: cierra.toISOString(),
    // En el pasado: la mesa tiene que verse al cargar la pantalla. Antes de
    // `reveal_at`, Mi mesa no da ni sitio ni acompañantes, y sin fase 1 no
    // hay tarjeta de juego.
    reveal_at: revela.toISOString(),
    restaurant_id: sitio.id,
    // `locked` y no `open`: no admite gente nueva. Que no salga en la
    // portada ni en la agenda de nadie lo hace `es_prueba`.
    status: 'locked',
    seats_per_table: PLAZAS,
    es_prueba: true,
    min_tables: 1,
    max_seats: PLAZAS,
    price_usd: 7,
    credit_cost: 1,
    zone_slug: 'chacao',
    city_slug: 'caracas',
  })

  await crear('event_venues', {
    event_id: evento.id,
    restaurant_id: sitio.id,
    zone_slug: 'chacao',
    max_tables: 1,
  })

  writeFileSync(
    RASTRO,
    JSON.stringify({ evento: evento.id, restaurante: sitio.id, gente, pares: [] }, null, 2),
  )

  // --- las reservas de los de verdad ---
  for (const p of gente) {
    await crear('bookings', {
      event_id: evento.id,
      profile_id: p.id,
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    })
  }

  // --- los acompañantes, hasta seis ---
  const faltan = PLAZAS - gente.length
  if (faltan > 0) {
    // `--sin-borrar` no es un adorno: sin él, `sembrar-mesa` empieza
    // barriendo TODAS las cuentas del dominio de prueba y la fecha que tenga
    // anotada, que hoy es la cena sembrada del 29 con sus doce cuentas y el
    // bloqueo puesto a mano. Montar una mesa para jugar veinte minutos no
    // puede cobrarse eso de paso.
    execFileSync(
      'node',
      [
        'scripts/sembrar-mesa.mjs',
        '--fecha', evento.id,
        '--cuantos', String(faltan),
        '--sin-borrar',
        // Tanda propia: los correos Y los teléfonos de la siembra del 29
        // siguen ocupados, y las dos columnas son únicas.
        '--tanda', String(TANDA),
      ],
      { stdio: 'inherit' },
    )
  }

  // --- la foto de los pares, antes de que exista la mesa ---
  const apuntados = await rest(`bookings?event_id=eq.${evento.id}&select=profile_id`)
  const todos = apuntados.map((b) => b.profile_id)
  const pares = await paresEntre(todos)
  const rastro = JSON.parse(readFileSync(RASTRO, 'utf8'))
  const deVerdad = gente.map((g) => g.id)
  rastro.gente = todos.map((id) => ({ id }))
  // Los acompañantes se anotan UNO A UNO, no por dominio: el barrido por
  // dominio alcanza también a las doce de la siembra del 29.
  rastro.acompanantes = todos.filter((id) => !deVerdad.includes(id))
  rastro.pares = pares
  writeFileSync(RASTRO, JSON.stringify(rastro, null, 2))

  const abre = empezo.getTime()
  const cierraJuego = abre + 240 * 60_000
  const hora = (t) =>
    new Date(t).toLocaleTimeString('es-VE', {
      timeZone: 'America/Caracas',
      hour: '2-digit',
      minute: '2-digit',
    })

  console.log(`\nFecha de prueba montada: ${evento.id}`)
  console.log(`   empezó hace ${minutosDesdeQueEmpezo} min · ${todos.length} apuntados · ${SITIO}`)
  console.log(`   el juego está abierto desde las ${hora(abre)} hasta las ${hora(cierraJuego)}`)
  console.log(`   la push del juego se encolará para las ${hora(abre + 20 * 60_000)}`)
  if (pares.length) {
    console.log(`   ${pares.length} pares ya existían entre esta gente: anotados para reponerlos`)
  }
  console.log('\nFalta repartir y PUBLICAR desde el panel. Publicar es lo que')
  console.log('siembra la mesa, registra los pares y encola la push del juego.')
  // CON SU TANDA. Sin ella, `--borrar` se lleva la tanda 1, que puede ser
  // justo la que se quiere conservar.
  const cola = TANDA === 1 ? '' : ` --tanda ${TANDA}`
  console.log(`\nAl acabar:  node scripts/mesa-del-juego.mjs --borrar${cola}\n`)
}

// --- argumentos -------------------------------------------------------

if (args.includes('--borrar')) {
  await borrar()
  process.exit(0)
}

if (args.includes('--pares')) {
  await soloPares()
  process.exit(0)
}

const iEmpezo = args.indexOf('--empezo')
const minutos = iEmpezo >= 0 ? Number(args[iEmpezo + 1]) : 20
// Por el arroba y nada más. Mirar la posición —«todo menos el valor de
// --empezo»— se comía el primer correo cuando `--empezo` no venía, porque
// `indexOf` devuelve -1 y el valor caía en la posición 0.
const correos = args.filter((a) => a.includes('@'))

if (!(TANDA >= 1 && TANDA <= 4)) {
  console.error('--tanda va de 1 a 4')
  process.exit(1)
}

if (!(PLAZAS >= 2 && PLAZAS <= 6)) {
  console.error('--plazas va de 2 a 6')
  process.exit(1)
}

// Sin correos la mesa es toda de relleno. Vale para comprobar el circuito
// —que publicar encola lo que tiene que encolar— sin que vibre el teléfono de
// nadie: las cuentas de relleno no tienen ninguno.
if (!correos.length && !args.includes('--solo-relleno')) {
  console.error('Dame al menos un correo de una cuenta que exista.\n')
  console.error('   node scripts/mesa-del-juego.mjs alguien@correo.com otra@correo.com')
  console.error('   node scripts/mesa-del-juego.mjs --solo-relleno --tanda 2 --plazas 5')
  console.error('   node scripts/mesa-del-juego.mjs --pares')
  console.error('   node scripts/mesa-del-juego.mjs --borrar')
  process.exit(1)
}

if (!(minutos >= 0 && minutos < 240)) {
  console.error('--empezo va de 0 a 239: pasadas cuatro horas el juego ya cerró.')
  process.exit(1)
}

if (existsSync(RASTRO)) {
  console.error('Ya hay una mesa de prueba montada. Bórrala antes:\n')
  console.error('   node scripts/mesa-del-juego.mjs --borrar')
  process.exit(1)
}

await montar(correos, minutos)
