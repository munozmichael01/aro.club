import assert from 'node:assert/strict'
import { test } from 'node:test'

import { destinoDe } from '../src/avisos/maquina'

test('las push de seguir en contacto abren esa cena en Pasadas, y solo con un id válido (31-10)', () => {
  const id = '6f1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d'
  assert.equal(destinoDe({ tipo: 'contacto_cruzado', ruta: `/mesa?cena=${id}` }), `/mesa?cena=${id}`)
  assert.equal(destinoDe({ tipo: 'contacto_coincidencia', ruta: '/mesa?cena=../../perfil' }), '/mesa')
  assert.equal(destinoDe({ tipo: 'contacto_coincidencia' }), '/mesa')
})
