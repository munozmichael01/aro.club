/**
 * Encender, apagar y poner al día la preproducción.
 *
 *   node scripts/preprod.mjs estado
 *   node scripts/preprod.mjs apagar       borra la base de pruebas y deja de construir
 *   node scripts/preprod.mjs encender     la levanta otra vez desde cero, con lo de hoy
 *   node scripts/preprod.mjs actualizar   encendida: migraciones nuevas, catálogos y fechas
 *
 * APAGAR ES BORRAR. El proyecto de Supabase se elimina porque es lo único que
 * cobra, y porque aquí no vive nada que valga conservar: las cuentas y reservas
 * de esta base son todas de prueba, y `encender` la reconstruye en minutos.
 *
 * Producción no se toca: de ella solo se LEE, y al borrar se comprueba por nombre
 * y por referencia que el proyecto es el de pruebas. `supabase projects delete`
 * sin referencia caería en el proyecto enlazado, que es el de producción.
 *
 * Las claves viven en `.env.preprod.local`, que no se sube. El token de Vercel
 * sale de VERCEL_TOKEN y la sesión de Supabase, de la CLI.
 */
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const PRODUCCION = 'qdydmklrbsdemzvjsldo'
const NOMBRE = 'aro-preprod'
const ORGANIZACION = 'ffckhezchifbslpkhrcj'
const REGION = 'us-east-1'
const WEB = 'https://preprod.aro.club'
const EQUIPO = 'team_DKpMcun71reOWVnIwbkCUmLd'
const PROYECTO_VERCEL = 'prj_TLO0yqZzy2TL49NJ3v2E6zVA6gIm'
const REPO = 1320820241
const FLUJO = 'preprod.yml'

const RUTA_ENV = new URL('../.env.preprod.local', import.meta.url).pathname
const RUTA_GUIA = new URL('../.preprod-guia.md', import.meta.url).pathname
const pausa = (ms) => new Promise((r) => setTimeout(r, ms))

function leerEnv() {
  return Object.fromEntries(
    fs.readFileSync(RUTA_ENV, 'utf8').split('\n').filter((l) => l.includes('='))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  )
}

function escribirEnv(valores) {
  const texto = Object.entries(valores).filter(([, v]) => v != null).map(([k, v]) => `${k}=${v}`).join('\n') + '\n'
  fs.writeFileSync(RUTA_ENV, texto, { mode: 0o600 })
}

/** La salida de un comando no se imprime nunca: lleva claves. */
function correr(cmd, args, { tolerar = false } = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: 300_000 })
  if (r.status !== 0 && !tolerar) {
    throw new Error(`${cmd} ${args[0]} ${args[1] ?? ''} falló (${r.status})`)
  }
  return r
}

const supabase = (args, op) => correr('npx', ['--yes', 'supabase', ...args], op)

function buscarProyecto() {
  const salida = supabase(['projects', 'list', '-o', 'json']).stdout
  const datos = JSON.parse(salida.slice(salida.search(/[[{]/)))
  const lista = Array.isArray(datos) ? datos : datos.projects
  const suyos = lista.filter((p) => p.name === NOMBRE)
  if (suyos.length > 1) throw new Error(`Hay ${suyos.length} proyectos llamados ${NOMBRE}: no adivino cuál es.`)
  const p = suyos[0]
  if (p && (p.ref ?? p.id) === PRODUCCION) throw new Error('El proyecto de pruebas apunta a producción. Paro.')
  return p ? { ref: p.ref ?? p.id, estado: p.status } : null
}

async function vercel(metodo, ruta, cuerpo) {
  if (!process.env.VERCEL_TOKEN) throw new Error('Falta VERCEL_TOKEN.')
  const sep = ruta.includes('?') ? '&' : '?'
  const r = await fetch(`https://api.vercel.com${ruta}${sep}teamId=${EQUIPO}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`Vercel ${metodo} ${ruta.split('?')[0]}: ${r.status} ${j.error?.message ?? ''}`)
  return j
}

// --- la llave del enlace del analista -------------------------------------

async function llavesActuales() {
  const j = await vercel('GET', `/v9/projects/${PROYECTO_VERCEL}`)
  return Object.keys(j.protectionBypass ?? {})
}

async function quitarLlaves() {
  for (const secreto of await llavesActuales()) {
    await vercel('PATCH', `/v1/projects/${PROYECTO_VERCEL}/protection-bypass`, { revoke: { secret: secreto, regenerate: false } })
  }
}

async function crearLlave() {
  const j = await vercel('PATCH', `/v1/projects/${PROYECTO_VERCEL}/protection-bypass`, { generate: { note: 'preprod: analista' } })
  const llaves = Object.keys(j.protectionBypass ?? {})
  if (llaves.length !== 1) throw new Error(`Esperaba una llave y hay ${llaves.length}.`)
  return llaves[0]
}

// --- apagar ---------------------------------------------------------------

async function apagar() {
  const proyecto = buscarProyecto()
  await quitarLlaves()
  console.log('Enlace del analista: anulado.')

  correr('gh', ['workflow', 'disable', FLUJO], { tolerar: true })
  console.log('Espejo de main: parado.')

  if (proyecto) {
    if (!proyecto.ref || proyecto.ref === PRODUCCION) throw new Error('Referencia no válida. No borro.')
    supabase(['projects', 'delete', proyecto.ref, '--yes'])
    console.log(`Base ${proyecto.ref}: borrada.`)
  } else {
    console.log('La base ya no existía.')
  }

  const e = leerEnv()
  for (const k of ['PREPROD_REF', 'PREPROD_DB_PASSWORD', 'PREPROD_BYPASS', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) delete e[k]
  escribirEnv(e)
  fs.rmSync(RUTA_GUIA, { force: true })
  console.log('Apagada. Supabase deja de cobrarla desde ahora.')
}

// --- encender -------------------------------------------------------------

async function esperarBase(ref) {
  for (let i = 0; i < 40; i++) {
    const p = buscarProyecto()
    if (p?.ref === ref && p.estado === 'ACTIVE_HEALTHY') return
    await pausa(15_000)
  }
  throw new Error('La base no quedó lista en diez minutos.')
}

/** El pooler cambia de `aws-0` a `aws-1` según cuándo nació el proyecto. */
function migrar(e) {
  const clave = encodeURIComponent(e.PREPROD_DB_PASSWORD)
  for (const anfitrion of ['aws-0', 'aws-1']) {
    const url = `postgresql://postgres.${e.PREPROD_REF}:${clave}@${anfitrion}-${REGION}.pooler.supabase.com:5432/postgres`
    for (let i = 0; i < 4; i++) {
      const r = supabase(['db', 'push', '--db-url', url, '--yes'], { tolerar: true })
      if (r.status === 0) return
      spawnSync('sleep', ['15'])
    }
  }
  throw new Error('No se pudieron aplicar las migraciones.')
}

function sembrar() {
  correr('node', [new URL('./preprod-sembrar.mjs', import.meta.url).pathname])
}

async function crearAnalista(e) {
  const a = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await a.auth.admin.createUser({
    email: e.ANALISTA_CORREO, password: e.ANALISTA_CLAVE, email_confirm: true,
  })
  if (error) throw new Error(`analista: ${error.message}`)
  const { error: e2 } = await a.from('profiles').upsert({
    id: data.user.id,
    email: e.ANALISTA_CORREO,
    full_name: 'Analista de pruebas',
    display_name: 'Analista',
    role: 'admin',
    status: 'active',
    city_slug: 'caracas',
    birthdate: '1990-01-01',
    gender: 'sin-decir',
    phone_e164: '+584121234567',
  })
  if (e2) throw new Error(`analista: ${e2.message}`)
}

/** Vercel guarda las claves por entorno. Solo se tocan las de preproducción. */
async function ponerVariables(e) {
  const { envs } = await vercel('GET', `/v9/projects/${PROYECTO_VERCEL}/env`)
  for (const clave of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
    const fila = envs.find((v) => v.key === clave && v.customEnvironmentIds?.includes(e.PREPROD_VERCEL_ENV))
    if (!fila) throw new Error(`Falta ${clave} en el entorno de preproducción de Vercel.`)
    if (fila.target?.includes('production')) throw new Error(`${clave}: esa variable también es de producción. No la toco.`)
    await vercel('PATCH', `/v9/projects/${PROYECTO_VERCEL}/env/${fila.id}`, { value: e[clave] })
  }
}

async function desplegar() {
  correr('git', ['fetch', '-q', 'origin', 'main'])
  correr('git', ['push', '-q', '--force', 'origin', 'FETCH_HEAD:refs/heads/preprod'])
  const d = await vercel('POST', '/v13/deployments?forceNew=1', {
    name: 'aro-club',
    project: PROYECTO_VERCEL,
    customEnvironmentSlugOrId: 'preprod',
    gitSource: { type: 'github', repoId: REPO, ref: 'preprod' },
  })
  for (let i = 0; i < 40; i++) {
    await pausa(15_000)
    const { readyState } = await vercel('GET', `/v13/deployments/${d.id}`)
    if (readyState === 'READY') return
    if (readyState === 'ERROR' || readyState === 'CANCELED') throw new Error(`El despliegue terminó en ${readyState}.`)
  }
  throw new Error('El despliegue no terminó en diez minutos.')
}

async function comprobar(e) {
  const pedir = (cabeceras) => fetch(`${WEB}/`, { headers: cabeceras, redirect: 'manual' }).then((r) => r.status)
  const basica = 'Basic ' + Buffer.from(`aro:${e.PREPROD_CLAVE}`).toString('base64')
  const llave = { 'x-vercel-protection-bypass': e.PREPROD_BYPASS }
  const sin = await pedir({})
  const conLlave = await pedir(llave)
  const conTodo = await pedir({ ...llave, Authorization: basica })
  if (sin === 200 || conLlave === 200 || conTodo !== 200) {
    throw new Error(`Las puertas no responden como deben: ${sin} / ${conLlave} / ${conTodo}.`)
  }
  const prox = await fetch(`${WEB}/api/proxima`, { headers: { ...llave, Authorization: basica } }).then((r) => r.json())
  if (!prox.hay) throw new Error('La web no ve fechas: no está leyendo la base de pruebas.')
}

function escribirGuia(e) {
  fs.writeFileSync(RUTA_GUIA, `# Preproducción de Aro Club

Copia de la web con base propia, para montar y depurar la medición sin tocar a
nadie real. Todo lo que hagas aquí es de prueba y se borra al apagarla.

## Entrar

1. Abre este enlace una vez en cada navegador (deja una cookie):
   ${WEB}/?x-vercel-protection-bypass=${e.PREPROD_BYPASS}&x-vercel-set-bypass-cookie=true
2. El navegador pide usuario y clave. Usuario: \`aro\`. Clave: \`${e.PREPROD_CLAVE}\`
3. Tu usuario admin, para aprobar verificaciones y pagos. Panel de operación, en ${WEB}/operacion. Entra con correo y contraseña:
   ${e.ANALISTA_CORREO} / ${e.ANALISTA_CLAVE}

## Primero de todo: GTM

El contenedor es el mismo de producción (GTM-M3RMGKVK). **Antes de navegar**,
excluye el hostname \`preprod.aro.club\` de las etiquetas que mandan a GA4 y a
Meta, o manda ese tráfico a una propiedad de pruebas. Si no, lo que hagas aquí
ensucia los datos reales.

## Recorrido para medir

Alta en /empezar → datos y cuestionario → /verificacion (vale cualquier foto) →
apruébala en el panel, pestaña Verificaciones → /agenda → pago con Pago Móvil →
«Ya pagué, lo reporto» con una referencia inventada → /estas-dentro → confírmalo
en el panel, pestaña Pagos («Confirmar pago»).

Los datos bancarios que se ven son falsos: no hay que pagar nada.

Si necesitas otra cuenta, usa un correo que no exista (por ejemplo
prueba1@preprod.aro.club): aquí no sale ningún correo.

## Lo que no hay aquí

- Correos: no sale ninguno, y lo que dependa de abrir uno no se puede recorrer.
- Crons: no corren. Las fechas y la tasa se renuevan con \`actualizar\`.
- Google y Apple: el botón da error. Solo correo y contraseña.
- La app móvil: sigue apuntando a producción.
`, { mode: 0o600 })
}

async function encender() {
  if (buscarProyecto()) throw new Error('Ya está encendida. Para ponerla al día: node scripts/preprod.mjs actualizar')

  const e = leerEnv()
  e.PREPROD_DB_PASSWORD = randomBytes(18).toString('hex')
  supabase(['projects', 'create', NOMBRE, '--org-id', ORGANIZACION, '--db-password', e.PREPROD_DB_PASSWORD, '--region', REGION])
  const nuevo = buscarProyecto()
  if (!nuevo) throw new Error('Supabase no devuelve el proyecto recién creado.')
  e.PREPROD_REF = nuevo.ref
  escribirEnv(e)
  console.log(`Base ${nuevo.ref}: creada. Esperando a que arranque…`)
  await esperarBase(nuevo.ref)

  const salida = supabase(['projects', 'api-keys', '--project-ref', nuevo.ref, '-o', 'json']).stdout
  const llaves = JSON.parse(salida.slice(salida.search(/[[{]/)))
  e.NEXT_PUBLIC_SUPABASE_URL = `https://${nuevo.ref}.supabase.co`
  e.NEXT_PUBLIC_SUPABASE_ANON_KEY = llaves.find((k) => k.name === 'anon').api_key
  e.SUPABASE_SERVICE_ROLE_KEY = llaves.find((k) => k.name === 'service_role').api_key
  escribirEnv(e)

  migrar(e)
  console.log('Migraciones: aplicadas.')
  sembrar()
  console.log('Catálogos, locales y fechas: copiados.')
  await crearAnalista(e)

  await ponerVariables(e)
  correr('gh', ['workflow', 'enable', FLUJO], { tolerar: true })
  e.PREPROD_BYPASS = await crearLlave()
  escribirEnv(e)
  console.log('Variables y enlace: listos. Desplegando…')
  await desplegar()
  await comprobar(e)
  escribirGuia(e)
  console.log(`Encendida y comprobada. La guía para el analista está en ${RUTA_GUIA}`)
}

// --- actualizar -----------------------------------------------------------

async function actualizar() {
  if (!buscarProyecto()) throw new Error('Está apagada. Para levantarla: node scripts/preprod.mjs encender')
  const e = leerEnv()
  migrar(e)
  sembrar()
  await comprobar(e)
  console.log('Al día: migraciones, catálogos, tasa y fechas. El código lo trae solo el espejo de main.')
}

async function estado() {
  const p = buscarProyecto()
  console.log(p ? `Encendida: base ${p.ref}, ${p.estado}.` : 'Apagada: no hay base de pruebas.')
  console.log(`Enlaces de acceso activos: ${(await llavesActuales()).length}.`)
}

const ordenes = { apagar, encender, actualizar, estado }
const orden = ordenes[process.argv[2]]
if (!orden) {
  console.error('Uso: node scripts/preprod.mjs estado | apagar | encender | actualizar')
  process.exit(1)
}
orden().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
