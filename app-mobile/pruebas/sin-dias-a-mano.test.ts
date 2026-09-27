/**
 * Ningún día ni hora escritos a mano en la app (PEDIDO §6 bis, regla 2;
 * TEXTO-tres-superficies §4.1).
 *
 * Salen de la fecha del evento, calculados en `src/texto/fechas.ts`, que es
 * el ÚNICO fichero que puede tener los nombres de los días. Si esta prueba
 * falla, alguien escribió «sábado» o «a las siete» en una pantalla: así es
 * como la web acabó con 71 sustituciones en 24 ficheros.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

const RAIZ = path.resolve(import.meta.dirname, '../src')

/** El sitio de los días, y los catálogos de desarrollo, que no son producto. */
const PERMITIDOS = new Set(['texto/fechas.ts', 'app/catalogo-entrada.tsx', 'app/catalogo-datos.tsx', 'diseno/Catalogo.tsx'])

const PROHIBIDO = [
  /\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bados?|domingos?)\b/i,
  /\bmediod[ií]a\b/i,
  /\ba las (una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|\d{1,2})\b/i,
  /(?<![\d.])\d{1,2}:\d{2}\b/,
]

function ficheros(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? ficheros(p) : /\.(ts|tsx)$/.test(e.name) ? [p] : []
  })
}

/** Sin comentarios: un comentario que explica por qué no se escribe «sábado» no es copy. */
const sinComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

test('ningún día ni hora escritos a mano fuera de texto/fechas.ts', () => {
  const hallazgos: string[] = []
  for (const f of ficheros(RAIZ)) {
    const rel = path.relative(RAIZ, f)
    if (PERMITIDOS.has(rel)) continue
    sinComentarios(fs.readFileSync(f, 'utf8'))
      .split('\n')
      .forEach((linea, i) => {
        for (const r of PROHIBIDO) {
          const m = linea.match(r)
          if (m) hallazgos.push(`${rel}:${i + 1} «${m[0]}»`)
        }
      })
  }
  assert.deepEqual(hallazgos, [], `Días u horas a mano:\n  ${hallazgos.join('\n  ')}`)
})

test('la prueba de verdad caza lo que dice cazar', () => {
  for (const s of ['Tu mesa del sábado', 'el jueves', 'a las siete', 'a las 12', 'a mediodía', 'a las 19:30'])
    assert.ok(PROHIBIDO.some((r) => r.test(s)), s)
  for (const s of ['Sabadell', '4 días y 3 h', 'v3.12'])
    assert.ok(!PROHIBIDO.some((r) => r.test(s)), s)
})
