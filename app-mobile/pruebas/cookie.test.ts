/**
 * La cookie que arma la app, leída por el MISMO código que la lee en el
 * servidor (`@supabase/ssr`, el de la web). Si un día cambia su formato,
 * esto falla aquí y no en el celular de alguien.
 *
 *   npm test
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createServerClient } from '@supabase/ssr'

import { base64url, cookieDeSesion, nombreDeCookie } from '../src/sesion/cookie'

const URL_SB = 'https://qdydmklrbsdemzvjsldo.supabase.co'

/** Un JWT con forma válida y caducidad lejana; el SDK no lo verifica en `getSession`. */
function jwt(extra: object = {}) {
  const b = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const exp = Math.floor(Date.now() / 1000) + 3600
  return `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ sub: 'u1', exp, ...extra })}.firma`
}

function sesion(user: object) {
  return {
    access_token: jwt(),
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'NO-DEBE-SALIR',
    user,
  }
}

/** Lo que haría el servidor: leer las cookies y sacar la sesión. */
async function leidaPorElServidor(cabecera: string) {
  const cookies = cabecera.split('; ').map((p) => {
    const i = p.indexOf('=')
    return { name: p.slice(0, i), value: p.slice(i + 1) }
  })
  const c = createServerClient(URL_SB, 'anon', {
    cookies: { getAll: () => cookies, setAll: () => {} },
    auth: { autoRefreshToken: false },
  } as never)
  const { data } = await c.auth.getSession()
  return data.session
}

test('base64url coincide con el de Node, byte a byte', () => {
  for (let n = 0; n < 50; n++) {
    const bytes = new Uint8Array(n).map(() => Math.floor(Math.random() * 256))
    assert.equal(base64url(bytes), Buffer.from(bytes).toString('base64url'))
  }
})

test('el nombre sale del proyecto, no escrito a mano', () => {
  assert.equal(nombreDeCookie(URL_SB), 'sb-qdydmklrbsdemzvjsldo-auth-token')
})

test('el servidor la entiende, con tildes y eñes', async () => {
  const s = sesion({ id: 'u1', user_metadata: { full_name: 'María Peña Núñez' } })
  const leida = await leidaPorElServidor(cookieDeSesion(s, URL_SB))
  assert.equal(leida?.access_token, s.access_token)
  assert.equal((leida?.user as any).user_metadata.full_name, 'María Peña Núñez')
})

test('el refresh token nunca viaja', async () => {
  const s = sesion({ id: 'u1' })
  const cabecera = cookieDeSesion(s, URL_SB)
  const leida = await leidaPorElServidor(cabecera)
  assert.equal(leida?.refresh_token, '')
  const crudo = Buffer.from(cabecera.split('=base64-')[1], 'base64url').toString()
  assert.ok(!crudo.includes('NO-DEBE-SALIR'))
})

test('una sesión grande va en trozos y el servidor la recompone', async () => {
  const s = sesion({ id: 'u1', user_metadata: { relleno: 'x'.repeat(6000) } })
  const cabecera = cookieDeSesion(s, URL_SB)
  assert.ok(cabecera.includes('-auth-token.0=') && cabecera.includes('-auth-token.2='))
  const leida = await leidaPorElServidor(cabecera)
  assert.equal(leida?.access_token, s.access_token)
})
