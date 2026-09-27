import { router } from 'expo-router'

import { Cuestionario } from '../cuestionario/Cuestionario'
import type { CatalogoCompleto, crearServicioCuestionario } from '../cuestionario/servicio'

/**
 * El cuestionario con un servidor SIMULADO, para recorrerlo en el navegador.
 * Catálogo de desarrollo: no se enlaza desde ningún sitio. Un ejemplo de cada
 * tipo de pregunta; las respuestas del servidor imitan las reales
 * (comprobadas en `pruebas/alta-completa-contra-la-api.mjs`).
 */
const op = (...pares: [string, string][]) => pares.map(([valor, label]) => ({ valor, label }))
const base = { ayuda: null, min: null, max: null, obligatoria: true, layout: null, exclusiva: null, autocomplete: null }
const CATALOGO: CatalogoCompleto = {
  version: 'simulado',
  preguntas: [
    { ...base, clave: 'nacimiento', enunciado: '¿Cuándo naciste?', tipo: 'date', opciones: [], pantalla: 1, ayuda: 'Nadie ve tu edad exacta.' },
    { ...base, clave: 'genero', enunciado: '¿Con qué género te identificas?', tipo: 'single', opciones: op(['mujer', 'Mujer'], ['hombre', 'Hombre'], ['no-binario', 'No binario']), pantalla: 1 },
    { ...base, clave: 'sector', enunciado: '¿En qué sector trabajas?', tipo: 'single', layout: 'compacta', opciones: op(['salud', 'Salud'], ['tecnologia', 'Tecnología'], ['educacion', 'Educación'], ['finanzas', 'Finanzas']), pantalla: 1 },
    { ...base, clave: 'empleador', enunciado: '¿Dónde trabajas actualmente?', tipo: 'text', opciones: [], autocomplete: ['Banesco', 'Mercantil', 'Polar'], pantalla: 1 },
    { ...base, clave: 'romance', enunciado: 'Aro no es una app de citas, pero a veces pasa. ¿Cómo lo ves?', tipo: 'single', obligatoria: false, opciones: op(['no', 'No busco eso'], ['abierto', 'Si pasa, pasa']), pantalla: 2 },
    { ...base, clave: 'temas', enunciado: '¿De qué podrías hablar dos horas seguidas?', tipo: 'multi', min: 2, max: 4, opciones: op(['cocina', 'Cocina'], ['viajes', 'Viajes'], ['cine', 'Cine'], ['musica', 'Música'], ['libros', 'Libros']), pantalla: 3 },
    { ...base, clave: 'evitar', enunciado: '¿Hay algún tema que prefieras que no salga?', tipo: 'multi', obligatoria: false, exclusiva: 'ninguno', opciones: op(['politica', 'Política'], ['religion', 'Religión'], ['ninguno', 'Ninguno']), pantalla: 3 },
    { ...base, clave: 'gasto', enunciado: '¿Cuánto piensas gastar en la cena?', tipo: 'single', opciones: op(['20', 'Hasta 20 USD'], ['35', 'Hasta 35 USD']), pantalla: 4 },
    { ...base, clave: 'zonas', enunciado: '¿En qué zonas puedes asistir sin problema?', tipo: 'multi', min: 1, opciones: op(['mercedes', 'Las Mercedes'], ['chacao', 'Chacao'], ['rosal', 'El Rosal']), pantalla: 5 },
    { ...base, clave: 'idiomas', enunciado: '¿En qué idiomas conversas cómodo?', tipo: 'multi', min: 1, opciones: op(['es', 'Español'], ['en', 'Inglés']), pantalla: 5 },
  ],
}
const espera = (ms: number) => new Promise((ok) => setTimeout(ok, ms))
const guardadas: Record<string, unknown> = {}
const obligatorias = CATALOGO.preguntas.filter((q) => q.obligatoria).map((q) => q.clave)
const faltan = () => obligatorias.filter((c) => guardadas[c] == null || guardadas[c] === '' || (Array.isArray(guardadas[c]) && !(guardadas[c] as unknown[]).length))

const simulado: ReturnType<typeof crearServicioCuestionario> = {
  async catalogo() {
    return { ok: true, datos: CATALOGO }
  },
  async zonas() {
    return { ok: true, datos: { zonas: [{ slug: 'chacao', nombre: 'Chacao' }, { slug: 'mercedes', nombre: 'Las Mercedes' }] } }
  },
  async cargar() {
    await espera(120)
    return { ok: true, datos: { respuestas: {}, heredadas: [], pantalla: 0, completado: false, faltan: faltan(), donde: '/datos' } }
  },
  async enviar(_lead, clave, valor) {
    await espera(60)
    guardadas[clave] = valor
    return { ok: true, datos: { completo: faltan().length === 0, faltan: faltan() } }
  },
}

export default function Pantalla() {
  return (
    <Cuestionario
      servicio={simulado}
      tieneCuenta={false}
      alVolver={() => router.back()}
      alDatos={() => router.push('/datos')}
      alEntrar={() => router.push('/entrar')}
      alCuenta={() => router.push('/cuenta')}
    />
  )
}
