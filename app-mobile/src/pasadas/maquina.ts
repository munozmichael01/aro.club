/**
 * Mi mesa · Próxima y Pasadas (entrega mi-mesa-pasadas de Design, 31-10),
 * sin React: de lo que dice el servidor a lo que se pinta.
 *
 * El servidor decide qué está pendiente, qué es nuevo y en qué estado va cada
 * coincidencia (`/api/pasadas`, `/api/contacto`). Aquí solo se elige el copy,
 * que sale de `AroReglas.CONTACTO`: el mismo de la web y de los correos.
 */

import { reglas } from '../reglas'
import { FORMATOS } from '../texto/cuenta'
import * as F from '../texto/fechas'

const C = reglas.CONTACTO

export type Companero = { id: string; nombre: string; inicial: string }

export type Nuevo = { tipo: 'coincidencia' | 'cruce' | 'sinCruce'; nombres: string[] }

export type Pasada = {
  mesaId: string
  eventoId: string
  empiezaEn: string
  zonaHoraria: string | null
  formato: string | null
  sitio: string | null
  zona: string | null
  numeroMesa: number | null
  companeros: Companero[]
  encuesta: { pendiente: boolean; contadaEn: string | null }
  contacto: { porConfirmar: string[]; cierraEn: string | null; cruzadas: string[]; nuevo: Nuevo | null } | null
  pendiente: 'contacto' | 'encuesta' | null
  nuevo: boolean
  /** Contó la encuesta antes del 29-10, sin «¿seguir en contacto?»: se le pregunta aquí, solo aquí. */
  preguntarContacto?: boolean
}

/** La línea de Próxima: lo pendiente de una cena pasada, cuando hay una reserva activa delante. */
export type Linea = {
  tipo: 'contacto' | 'encuesta'
  mesaId: string
  empiezaEn: string
  zonaHoraria: string | null
  nombres: string[]
  cierraEn: string | null
}

export type DePasadas = { cenas: Pasada[]; linea: Linea | null; senal: boolean }

/** «Andrea también quiere seguir en contacto · quedan 6 días» o «Te falta contar cómo estuvo el jueves». */
export function textoLinea(l: Linea, ahora: number): string {
  if (l.tipo === 'contacto') return C.linea.porConfirmar(l.nombres, l.cierraEn ? C.quedanCorto(l.cierraEn, l.zonaHoraria, ahora) : '')
  return C.linea.encuesta(F.piezasDePasada(l.empiezaEn, l.zonaHoraria).elDia)
}

const plan = (formato: string | null) => (FORMATOS[formato ?? 'dinner'] ?? FORMATOS.dinner).singular

/** Lo que dice la fila de una cena en Pasadas (L1). */
export function filaDe(p: Pasada) {
  const f = F.piezasDePasada(p.empiezaEn, p.zonaHoraria)
  const n = p.contacto?.nuevo
  return {
    numero: f.numero,
    mes: f.mesCorto,
    titulo: `${plan(p.formato)} · ${f.dia}`,
    sub: [p.sitio, p.zona].filter(Boolean).join(' · '),
    etiqueta: p.pendiente === 'contacto' ? C.pasadas.contacto : p.pendiente === 'encuesta' ? C.pasadas.encuesta : null,
    // La línea de lo nuevo, solo con el punto: dice qué es.
    nuevo:
      p.nuevo && n
        ? n.tipo === 'coincidencia'
          ? C.pasadas.nuevo.coincidencia(n.nombres)
          : n.tipo === 'cruce'
            ? C.pasadas.nuevo.cruce(C.nombres(n.nombres))
            : C.pasadas.nuevo.sinCruce
        : null,
    punto: p.nuevo,
    // La ficha de la fecha va en verde cuando hay algo que mirar.
    resaltada: p.nuevo || !!p.pendiente,
  }
}

/** La cabecera de la vista de una cena: «JUEVES 29 DE OCTUBRE · CENA», el sitio y «Chacao · 7:00 p.m. · Mesa 04». */
export function cabeceraDe(p: { empiezaEn: string | null; zonaHoraria: string | null; formato: string | null; sitio: string | null; zona: string | null; numeroMesa: number | null }) {
  const f = F.piezasDePasada(p.empiezaEn, p.zonaHoraria)
  const hora = reglas.horaDe(p.empiezaEn, p.zonaHoraria) ?? ''
  return {
    sello: [f.cabecera, plan(p.formato).toUpperCase()].filter(Boolean).join(' · '),
    sitio: p.sitio ?? '',
    sub: [p.zona, hora, C.cena.mesa(p.numeroMesa)].filter(Boolean).join(' · '),
  }
}
