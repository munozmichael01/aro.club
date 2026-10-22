import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { fechasAbiertas, zonasConFecha, DURACION_MIN, type FechaDeAgenda } from '@/app/api/agenda/route'
import { FRECUENTES_AGENDA, PRECIO_USD, partesDe } from '@/lib/reglas'

/**
 * La agenda pública, servida por Next y no por una reescritura.
 *
 * Es la única pantalla que no se sirve tal cual, y la excepción tiene una
 * razón que no vale para las demás: lo que esta página tiene de valor para
 * un buscador —y para el asistente que hoy responde «¿qué hay esta semana en
 * Caracas?» sin que nadie visite nada— son LAS FECHAS, y las fechas salen de
 * la base. Un rastreador no ejecuta JavaScript: si la lista se arma al
 * vuelo, para él esta página está en blanco.
 *
 * Lo que se pega es lo que no puede esperar al navegador:
 *
 *   · un `Event` de Schema.org por fecha, con su hora, su zona y su precio;
 *   · las cinco preguntas en `FAQPage`, con las zonas de verdad dentro;
 *   · la lista en texto dentro del `<noscript>`.
 *
 * El resto —la pantalla, los estilos, el botón— sigue siendo el fichero de
 * `public/` sin traducción de por medio, que es la regla de toda la casa.
 */
export const dynamic = 'force-dynamic'

const FICHERO = join(process.cwd(), 'public', 'Aro Club - Agenda.dc.html')

/** Dentro de un `<script>`, un `<` suelto cierra la etiqueta antes de tiempo. */
const aJson = (x: unknown) => JSON.stringify(x, null, 2).replace(/</g, '\\u003c')

const escapar = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** «Jueves 22 de octubre», en la hora de la ciudad de esa fecha. */
function diaLargo(f: FechaDeAgenda): string {
  const p = partesDe(f.empiezaEn, f.zonaHoraria)
  if (!p) return ''
  return p.dia.charAt(0).toUpperCase() + p.dia.slice(1) + ' ' + p.numero + ' de ' + p.mes
}

function eventoDe(f: FechaDeAgenda) {
  const zona = f.zonas.join(' o ')
  const edad =
    f.edadMinima != null && f.edadMaxima != null
      ? ` · ${f.edadMinima}-${f.edadMaxima}`
      : f.edadMinima != null
        ? ` · +${f.edadMinima}`
        : f.edadMaxima != null
          ? ` · hasta ${f.edadMaxima}`
          : ''
  const precio = f.precioUsd != null ? f.precioUsd : PRECIO_USD

  return {
    '@type': 'Event',
    name: `${f.nombreFormato} Aro Club · ${diaLargo(f)}${edad}`,
    startDate: f.empiezaEn,
    // La duración es la de la mesa: dos horas, siempre (`AroReglas.GUION`).
    // Si algún día un formato dura otra cosa, será un dato suyo que lo diga.
    endDate: new Date(new Date(f.empiezaEn).getTime() + DURACION_MIN * 60_000).toISOString(),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    // La ZONA y la ciudad, nunca el restaurante: el sitio se revela el mismo
    // día a mediodía y eso no es un detalle de implementación, es el
    // producto.
    location: {
      '@type': 'Place',
      name: zona ? `${zona}, Caracas` : 'Caracas',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Caracas',
        // La región solo cuando es UNA zona: con dos abiertas, «Chacao o Los
        // Palos Grandes» no es el nombre de ningún sitio. El nombre del
        // lugar sí las dice las dos, que es donde esa frase significa algo.
        ...(f.zonas.length === 1 ? { addressRegion: f.zonas[0] } : {}),
        addressCountry: 'VE',
      },
    },
    organizer: { '@id': 'https://aro.club/#org' },
    inLanguage: f.idioma ?? 'es-VE',
    description: `Seis personas verificadas que no se conocen. Nosotros elegimos el sitio${
      zona ? ` en ${zona}` : ''
    } y lo decimos el mismo día a las 12:00.`,
    offers: {
      '@type': 'Offer',
      price: String(precio),
      priceCurrency: 'EUR',
      url: 'https://aro.club/agenda',
      availability: 'https://schema.org/InStock',
      validThrough: f.cierraEn,
    },
  }
}

export async function GET() {
  const fechas = await fechasAbiertas()
  const zonas = zonasConFecha(fechas)

  const faqs = FRECUENTES_AGENDA.map(([p, r]) => ({
    '@type': 'Question',
    name: p,
    acceptedAnswer: {
      '@type': 'Answer',
      text: r.replace('{zonas}', zonas.length ? zonas.join(', ') : 'las zonas que abrimos cada semana'),
    },
  }))

  const grafo = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://aro.club/#org',
        name: 'Aro Club',
        url: 'https://aro.club/',
        logo: 'https://aro.club/favicon.svg',
        email: 'hola@aro.club',
      },
      ...fechas.map(eventoDe),
      { '@type': 'FAQPage', '@id': 'https://aro.club/agenda#faq', mainEntity: faqs },
    ],
  }

  const lista = fechas.length
    ? '<ul style="margin:0;padding-left:20px">' +
      fechas
        .map((f) => {
          const precio = f.precioUsd != null ? f.precioUsd : PRECIO_USD
          const p = partesDe(f.empiezaEn, f.zonaHoraria)
          const edad =
            f.edadMinima != null && f.edadMaxima != null
              ? ` (${f.edadMinima}-${f.edadMaxima})`
              : f.edadMinima != null
                ? ` (+${f.edadMinima})`
                : f.edadMaxima != null
                  ? ` (hasta ${f.edadMaxima})`
                  : ''
          const trozos = [
            `${f.nombreFormato}${edad}${f.etiquetaIdioma ? ` ${f.etiquetaIdioma.toLowerCase()}` : ''}: ${diaLargo(f)}`,
            p?.hora ?? '',
            f.zonas.join(' o '),
            `${precio} ref`,
          ].filter(Boolean)
          return `<li>${escapar(trozos.join(' · '))}</li>`
        })
        .join('') +
      '</ul>'
    : '<p>Ahora mismo no hay fechas abiertas.</p>'

  const html = readFileSync(FICHERO, 'utf8')
    .replace('<!--AGENDA-DATOS-->', `<script type="application/ld+json">\n${aJson(grafo)}\n</script>`)
    .replace('<!--AGENDA-LISTA-->', lista)

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Cinco minutos en el borde. Las fechas se abren a mano, una o dos
      // veces por semana: lo que no puede pasar es que cada visita de una
      // campaña se lleve dos consultas a la base.
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
