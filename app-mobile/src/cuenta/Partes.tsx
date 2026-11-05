import { useEffect, useRef, useState, type ReactNode } from 'react'
import { FilaComoFunciona } from '../como/Fila'
import { Animated, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'

import {
  Aviso,
  Boton,
  EnlacePie,
  Esqueleto,
  HojaAbajo,
  Hueso,
  HuesoForma,
  IconoCheck,
  IconoFlecha,
  IconoPin,
  IconoPunto,
  Marca,
  Texto,
  color,
  cremaAlfa,
  fuente,
  medida,
  radio,
  terracotaAlfa,
  tinta,
  useMovimientoReducido,
  verdeAlfa,
} from '../diseno'
import * as F from '../texto/fechas'
import * as T from '../texto/cuenta'
import type { Atajo, FilaAgenda, Filtro, Proximo, Tarjeta } from './maquina'
import { AvisoCasilla, BotonConCasilla, CargoDos } from '../masuno/Partes'
import { reglas } from '../reglas'
import { CabeceraComo, CarruselComo } from '../como/ComoFunciona'
import { Capsulas, CuadroPlan, EstaFecha, IconoPlan } from '../plan/Marcas'

/**
 * Las piezas del Inicio, calcadas de `Mi cuenta.dc.html`. Solo pintan: los
 * datos llegan ya calculados de `maquina.ts`.
 */

// --- Movimiento que respeta «reducir movimiento» ----------------------------

/** El latido del punto del reloj: opacidad que va y viene. Los huesos usan el latido compartido. */
function useLatido(desde: number, hasta: number, ms: number) {
  const v = useRef(new Animated.Value(desde)).current
  const quieto = useMovimientoReducido()
  useEffect(() => {
    if (quieto) return
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: hasta, duration: ms / 2, useNativeDriver: true }),
        Animated.timing(v, { toValue: desde, duration: ms / 2, useNativeDriver: true }),
      ]),
    )
    a.start()
    return () => a.stop()
  }, [v, desde, hasta, ms, quieto])
  return v
}

// --- Cabecera ---------------------------------------------------------------

// --- Esqueleto --------------------------------------------------------------

/**
 * El esqueleto del Inicio (entrega carga, 03-11), con los mismos contenedores
 * que la pantalla para que nada salte al llegar. Real: «Agenda» y el marco
 * de cada polaroid, con su giro. Hueso: el saludo, la tarjeta de estado, la
 * foto y el nombre de cada filtro, y las filas.
 */
export function EsqueletoInicio({ tarda }: { tarda?: ReactNode }) {
  return (
    <Esqueleto etiqueta={T.sinRespuesta.cargando}>
      {tarda}
      <Hueso variante="display" ancho={150} estilo={{ marginBottom: 22 }} />
      <View style={[estilos.bloque, { backgroundColor: color.cremaElevada }]}>
        <HuesoForma alto={32} ancho={140} capsula estilo={{ marginBottom: 16 }} />
        <Hueso variante="display" lineas={2} ultima="62%" />
        <Hueso variante="cuerpo" lineas={3} ultima="48%" estilo={{ marginTop: 13 }} />
        <HuesoForma alto={52} ancho={160} capsula estilo={{ marginTop: 26 }} />
      </View>
      <Seccion>
        <Texto variante="titulo" accessibilityRole="header" style={{ marginBottom: 12 }}>
          {T.agenda.titulo}
        </Texto>
        <View style={[estilos.carril, { flexDirection: 'row', overflow: 'hidden' }]}>
          <View style={[estilos.carrilDentro, { flexDirection: 'row' }]}>
            {(['todos', 'dinner', 'drinks'] as const).map((f) => (
              <View key={f} style={[estilos.polaroid, { width: ANCHO_POLAROID, borderColor: 'transparent', transform: [{ rotate: GIRO[f] }] }]}>
                <HuesoForma alto={ANCHO_POLAROID - 16} curva={6} />
                <View style={{ alignItems: 'center', paddingTop: 8 }}>
                  <HuesoForma alto={12} ancho={56} estilo={{ marginVertical: 5.5 }} />
                </View>
                <View style={{ alignItems: 'center', paddingTop: 3, paddingBottom: 9 }}>
                  <HuesoForma alto={8} ancho={40} estilo={{ marginVertical: 3 }} />
                </View>
              </View>
            ))}
          </View>
        </View>
        <HuesoForma alto={8} ancho={96} estilo={{ marginVertical: 3, marginBottom: 13 }} />
        <View style={{ gap: 9 }}>
          {[
            ['38%', '62%', '74%'],
            ['52%', '58%', '80%'],
            ['34%', '66%', '70%'],
          ].map(([a, b, c], i) => (
            <View key={i} style={[estilos.fecha, { backgroundColor: color.cremaElevada, borderColor: 'transparent' }]}>
              <HuesoForma alto={36} redondo />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Hueso variante="rotulo" ancho={a as `${number}%`} />
                <Hueso variante="cuerpoChico" ancho={b as `${number}%`} estilo={{ marginTop: 3 }} />
                <Hueso variante="nota" ancho={c as `${number}%`} estilo={{ marginTop: 2 }} />
              </View>
              <HuesoForma alto={34} redondo estilo={{ marginTop: 2 }} />
            </View>
          ))}
        </View>
      </Seccion>
    </Esqueleto>
  )
}

// --- La tarjeta de estado ---------------------------------------------------

function Reloj({ revelaEn, oscuro }: { revelaEn: string | null | undefined; oscuro: boolean }) {
  const [ahora, setAhora] = useState(Date.now())
  const o = useLatido(1, 0.4, 1600)
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const texto = F.relojDeRevelacion(revelaEn, ahora)
  if (!texto) return null
  return (
    <View style={estilos.reloj}>
      <Animated.View style={[estilos.relojPunto, { opacity: o }]} />
      {/* La web lo pinta siempre en verde pálido; sobre la tarjeta clara no llega a 2:1. */}
      <Texto variante="etiqueta" tono={oscuro ? 'sobreVerdeSecundario' : 'secundario'} style={{ letterSpacing: 1 }}>
        {texto}
      </Texto>
    </View>
  )
}

export function TarjetaEstado({ t, revelaEn, alAccion }: { t: Tarjeta; revelaEn: string | null | undefined; alAccion: () => void }) {
  const selloFondo = t.oscuro ? color.crema : t.calmado ? verdeAlfa(0.11) : color.terracotaRelleno
  const selloTinta = t.oscuro ? color.verdeProfundo : t.calmado ? color.verde : color.sobreTerracota
  return (
    <View style={[estilos.bloque, { backgroundColor: t.oscuro ? color.verdeProfundo : color.cremaElevada }]}>
      <View style={estilos.selloFila}>
        <View style={[estilos.sello, { backgroundColor: selloFondo }]}>
          <Texto variante="etiquetaChica" style={{ color: selloTinta, fontFamily: fuente.textoSemi, letterSpacing: 1.3 }}>
            {t.sello}
          </Texto>
        </View>
        <Reloj revelaEn={revelaEn} oscuro={t.oscuro} />
      </View>

      <Texto variante="display" tono={t.oscuro ? 'crema' : 'tinta'} accessibilityRole="header">
        {t.titulo}
      </Texto>
      <Texto variante="cuerpo" tono={t.oscuro ? 'cuerpoSobreVerde' : 'cuerpo'} style={{ marginTop: 13 }}>
        {t.cuerpo}
      </Texto>

      {t.mesa ? (
        <View style={estilos.mesa}>
          <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
            {t.mesa.numero ? (
              <View style={estilos.mesaNumero}>
                <Texto variante="etiquetaChica" tono="secundario" style={{ fontSize: 9 }}>
                  {T.mesa.etiqueta}
                </Texto>
                <Texto variante="cifra">{t.mesa.numero}</Texto>
              </View>
            ) : null}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Texto variante="titulo" tono="crema">
                {t.mesa.sitio}
              </Texto>
              <Texto variante="cuerpoChico" tono="cuerpoSobreVerde" style={{ marginTop: 5 }}>
                {t.mesa.direccion}
              </Texto>
              <Texto variante="cuerpoChico" tono="cuerpoSobreVerde">
                {t.mesa.cuando}
              </Texto>
            </View>
          </View>
          <View style={estilos.otros}>
            <Texto variante="etiquetaChica" tono="sobreVerdeSecundario" style={{ marginBottom: 4 }}>
              {T.mesa.losOtros}
            </Texto>
            {t.mesa.otros.map((c, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 11, alignItems: 'center' }}>
                <View style={[estilos.avatar, { backgroundColor: i % 2 ? cremaAlfa(0.16) : color.terracotaRelleno }]}>
                  <Texto variante="etiqueta" tono="crema" style={{ fontFamily: fuente.textoSemi, letterSpacing: 0 }}>
                    {c.inicial}
                  </Texto>
                </View>
                <Texto variante="rotulo" tono="crema" style={{ fontSize: 14 }}>
                  {c.nombre}
                </Texto>
                <Texto variante="nota" tono="sobreVerdeSecundario">
                  {c.sector}
                </Texto>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ marginTop: 26 }}>
        <Boton tipo={t.oscuro ? 'sobreVerde' : 'primario'} texto={t.accion} onPress={alAccion} />
      </View>
    </View>
  )
}

// --- La agenda --------------------------------------------------------------

const FOTOS: Record<string, { on: number; off: number }> = {
  dinner: { on: require('../../assets/fotos/filtro-cenas.jpg'), off: require('../../assets/fotos/filtro-cenas-apagada.jpg') },
  drinks: { on: require('../../assets/fotos/filtro-drinks.jpg'), off: require('../../assets/fotos/filtro-drinks-apagada.jpg') },
  movement: { on: require('../../assets/fotos/filtro-movimiento.jpg'), off: require('../../assets/fotos/filtro-movimiento-apagada.jpg') },
  coffee: { on: require('../../assets/fotos/filtro-coffee.jpg'), off: require('../../assets/fotos/filtro-coffee-apagada.jpg') },
  // Entrega 21. Foto de Pexels, provisional hasta tener fotos propias de brunch.
  brunch: { on: require('../../assets/fotos/filtro-brunch.jpg'), off: require('../../assets/fotos/filtro-brunch-apagada.jpg') },
}
const GIRO: Record<string, string> = { todos: '-1.2deg', dinner: '1.4deg', drinks: '-1.6deg', movement: '1.2deg', coffee: '-1.4deg', brunch: '1.6deg' }

/** Las medidas de la entrega 19: polaroids de 112 de ancho, 12 de separación. */
const ANCHO_POLAROID = 112
const SEPARACION = 12

/**
 * La polaroid ES el filtro (entrega 19). Marcada: recta, borde terracota de 2 y
 * nombre en terracota. Sin fechas, o con otro formato elegido: pierde color.
 * Sin filtro (un solo formato con fechas) no responde al toque.
 */
function Polaroid({ f, alPulsar }: { f: Filtro; alPulsar: () => void }) {
  const foto = (formato: string) => (f.apagada ? FOTOS[formato].off : FOTOS[formato].on)
  return (
    <Pressable
      onPress={f.toca ? alPulsar : undefined}
      disabled={!f.toca}
      accessibilityRole={f.toca ? 'button' : undefined}
      aria-selected={f.elegido}
      accessibilityLabel={f.detalle ? `${f.nombre}. ${f.detalle}` : f.nombre}
      style={[
        estilos.polaroid,
        {
          width: ANCHO_POLAROID,
          borderColor: f.elegido ? color.terracota : 'transparent',
          transform: [{ rotate: f.elegido ? '0deg' : GIRO[f.formato] ?? '0deg' }],
        },
      ]}
    >
      <View style={estilos.polaroidFoto}>
        {f.mosaico ? (
          <View style={estilos.mosaico}>
            {/* El mosaico de «Todos» es de 2 × 2: las cuatro primeras familias (el brunch no cabe). */}
            {T.ORDEN_FORMATOS.slice(0, 4).map((x) => (
              <Image key={x} source={FOTOS[x].on} style={estilos.mosaicoFoto} resizeMode="cover" />
            ))}
          </View>
        ) : (
          // Ancho y alto explícitos: con `absoluteFill`, iOS pintaba la foto a
          // su tamaño propio (360 pt) y se veía ampliada (TestFlight, 02-10-2026).
          <Image source={foto(f.formato)} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        )}
      </View>
      <Texto style={[estilos.polaroidNombre, { color: f.elegido ? color.terracota : f.hay ? color.verdeProfundo : color.secundario }]}>{f.nombre}</Texto>
      {/* Siempre la línea, aunque vaya vacía: todas las polaroids del mismo alto. */}
      <Texto style={estilos.polaroidDetalle}>{f.detalle || ' '}</Texto>
    </Pressable>
  )
}

const MARCAS: Record<string, { tinta: string; fondo: string }> = {
  dinner: { tinta: color.terracota, fondo: 'rgba(192,102,47,.14)' },
  drinks: { tinta: color.verde, fondo: verdeAlfa(0.12) },
  movement: { tinta: '#2D6A4F', fondo: 'rgba(45,106,79,.14)' },
  coffee: { tinta: color.secundario, fondo: 'rgba(86,106,93,.14)' },
  /** Entrega 21: quemado sobre melocotón al 24 %, el único con melocotón de fondo. */
  brunch: { tinta: color.terracota, fondo: 'rgba(227,156,99,.24)' },
}

type PropsFecha = {
  f: FilaAgenda
  textoReservar: (precio: string) => string
  /** Apartando: el aro en el botón, con lo que oye el lector de pantalla. */
  reservando?: string | false
  /** `aceptaCondiciones`: la casilla del aviso de una +1 (01-11). */
  alConfirmar: (aceptaCondiciones?: boolean) => void
  /** Le alcanzan los créditos para ESTA fecha (dos en una +1). */
  conCredito: boolean
  fallo: string
  /** Con crédito se pide aquí el permiso de grabación; sin crédito, en el pago. */
  pidePermiso: boolean
  permiso: boolean
  alPermiso: () => void
}

/**
 * Una fecha de la agenda. Tocarla abre su hoja de reservar, que sube desde
 * abajo (entrega «Qué estás reservando», A): antes se desplegaba aquí mismo.
 */
function FilaFecha(p: { f: FilaAgenda; alAbrir: () => void }) {
  const { f } = p
  const m = MARCAS[f.formato]
  const quieta = f.mia || f.cerrada
  return (
    <Pressable
      onPress={quieta ? undefined : p.alAbrir}
      accessibilityRole="button"
      aria-disabled={quieta}
      style={[
        estilos.fecha,
        {
          opacity: f.cerrada ? 0.58 : 1,
          backgroundColor: f.mia ? 'transparent' : color.cremaElevada,
          borderColor: f.mia ? color.verde : 'transparent',
        },
      ]}
    >
      {/* El icono del plan sobre crema tostado (E · Iconografía); suya, el check; cerrada, el punto. */}
      <View style={[estilos.fechaIcono, { backgroundColor: f.mia ? color.verde : f.cerrada ? m.fondo : '#F3E3C7' }]}>
        {f.cerrada ? <IconoPunto color={m.tinta} /> : f.mia ? <IconoCheck color={color.crema} /> : <IconoPlan formato={f.plan.formato} tam={19} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 4, alignItems: 'center' }}>
          <Texto variante="rotulo">{f.tipo}</Texto>
          {/* Todas las marcas de la fecha, en su orden: +45, +1, idioma, segundo acto (E · Etiquetas). */}
          <Capsulas capsulas={f.capsulas} />
        </View>
        <Texto variante="cuerpoChico" tono="secundario" style={{ marginTop: 3 }}>
          {f.cuando}
        </Texto>
        <Texto variante="nota" style={{ marginTop: 2 }}>
          {f.zonaYTamano}
        </Texto>
        {/* La prueba social solo con datos: «Una mesa es de 4 a 8 personas» ya no sale (Michael, 02-11). */}
        {f.conPrueba ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 9 }}>
            {quieta ? null : (
              <View style={estilos.barraFondo}>
                <View style={[estilos.barra, { width: `${Math.round(f.llenado * 100)}%`, backgroundColor: f.va ? color.verde : color.terracota }]} />
              </View>
            )}
            <Texto
              variante="etiqueta"
              style={{ fontFamily: fuente.textoSemi, letterSpacing: 0, flexShrink: 1, color: f.cerrada ? color.secundario : f.mia || f.va ? color.verde : color.terracota }}
            >
              {f.estado}
            </Texto>
          </View>
        ) : null}
      </View>
      {quieta ? null : (
        <View style={[estilos.flecha, { backgroundColor: color.verdeProfundo }]}>
          <IconoFlecha color={color.crema} />
        </View>
      )}
    </Pressable>
  )
}

/**
 * La hoja de reservar de una fecha (entrega «Qué estás reservando», A): sube
 * desde abajo, se cierra arrastrando hacia abajo, tocando fuera o con atrás.
 * Arriba, el plan: formato, marcas, día y «Esta fecha». Debajo, todo lo de
 * antes. El precio, el cierre y el botón, fijos al pie (F).
 */
function HojaFecha(p: PropsFecha & { alCerrar: () => void }) {
  const { f } = p
  // +1 con créditos: «Reservar dos puestos» no aparta todavía, cambia el botón por el aviso (2A).
  const [aviso, setAviso] = useState(false)
  const [entendido, setEntendido] = useState(false)
  // «¿Cómo funciona?» se abre DENTRO de esta hoja, no en otra encima (Michael, 03-11): cambia lo de dentro.
  const [viendo, setViendo] = useState<'fecha' | 'como'>('fecha')
  const como = viendo === 'como'
  const H = reglas.MAS_UNO.hoja
  const plan = { ...f.plan, empiezaEn: f.empiezaEn, zonaHoraria: f.zonaHoraria }
  const cierre = reglas.lineaDeCierre(f.empiezaEn, f.zonaHoraria, f.cierraEn)
  const formato = (T.FORMATOS[f.formato]?.singular ?? '').toUpperCase()

  const cabecera = como ? (
    <CabeceraComo alVolver={() => setViendo('fecha')} />
  ) : (
    <View style={{ paddingBottom: 10, paddingHorizontal: 20 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 14, marginRight: 52 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <CuadroPlan formato={f.plan.formato} />
          <Texto style={{ fontFamily: fuente.textoNegrita, fontSize: 12, lineHeight: 15, letterSpacing: 1.4, color: color.cuerpo }}>{formato}</Texto>
        </View>
        <Capsulas capsulas={f.capsulas} />
      </View>
      <Texto style={{ fontFamily: fuente.titular, fontSize: 28, lineHeight: 40, color: color.verdeProfundo, marginTop: 6 }} accessibilityRole="header">
        {f.cuando}
      </Texto>
      <Texto variante="cuerpoChico" tono="secundario" style={{ fontFamily: fuente.textoMedia }}>
        {f.zonaYTamano}
      </Texto>
    </View>
  )

  // El pie, fijo: lo que cubre y el precio, el cierre, el botón y qué pasa si cancelas.
  const pie = como ? null : (
    <View style={estilos.hojaPie}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <Texto variante="cuerpoChico" tono="secundario" style={{ flex: 1 }}>
          {reglas.cubreDelPlan(f.plan)}
        </Texto>
        {/* Con créditos se dice en encuentros, como la web (9170ac4); sin ellos, «10 ref» o «10 ref c/u». */}
        <Texto style={{ fontFamily: fuente.titular, fontSize: 22, lineHeight: 31, color: color.verdeProfundo }}>
          {p.conCredito ? T.agenda.encuentros(f.creditos) : reglas.precioDelPlan(f.plan)}
        </Texto>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <IconoReloj />
        <Texto variante="cuerpoChico" tono="secundario" style={{ flex: 1 }}>
          {cierre.texto}
        </Texto>
      </View>
      {/* El «no» del servidor, junto al botón. */}
      {p.fallo ? <Aviso tono="ojo">{p.fallo}</Aviso> : null}
      {f.masUno && aviso ? (
        <BotonConCasilla texto={H.boton(f.creditos)} marcado={entendido} onPress={() => p.alConfirmar(true)} />
      ) : (
        <Boton
          ancho
          texto={f.masUno ? (p.conCredito ? H.boton(f.creditos) : reglas.botonDelPlan(f.plan)) : p.textoReservar(f.precio)}
          // Sin créditos, el aviso del +1 sale en Pago (2B): allí se aparta.
          onPress={() => (f.masUno && p.conCredito ? setAviso(true) : p.alConfirmar())}
          apagado={cierre.cerrada || (f.graba && p.pidePermiso && !p.permiso)}
          trabajando={p.reservando}
        />
      )}
      {/* Lo que antes iba en la nota del precio (c21f168): cuándo recuperas el crédito. */}
      <Texto variante="nota" style={{ textAlign: 'center' }}>
        {reglas.cancelaDelPlan(f.plan)}
      </Texto>
    </View>
  )

  const cuerpo = como ? (
    <ScrollView style={{ flexGrow: 0, flexShrink: 1 }}>
      <CarruselComo plan={plan} alTerminar={() => setViendo('fecha')} />
    </ScrollView>
  ) : (
    <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 14 }}>
      <EstaFecha fecha={f.plan} />
      <View>
        <Texto variante="cuerpoChico" tono="secundario" style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: tinta(0.12) }}>
          {reglas.notaDelPlan(f.plan)}
        </Texto>
        {/* «¿Cómo funciona?» (C1): la fila ya trae sus filetes; el carrusel se abre en esta misma hoja. */}
        <FilaComoFunciona plan={plan} alAbrir={() => setViendo('como')} />
      </View>
      {/* +1: lo que «Esta fecha» no dice. «Vienes con alguien» se va: repetía su línea (Michael, 03-11). */}
      {f.masUno && p.conCredito ? <CargoDos uno={T.agenda.encuentros(1)} total={T.agenda.encuentros(f.creditos)} /> : null}
      {f.masUno && !p.conCredito ? <Texto variante="nota">{H.nota}</Texto> : null}
      {/* Las zonas que reservar le suma (31-10). Como la web. */}
      {f.zonasNuevas.length ? (
        <View style={[estilos.zonas, { marginBottom: 0 }]}>
          <View style={estilos.zonasIcono}>
            <IconoPin color={color.crema} />
          </View>
          <Texto variante="cuerpoChico" tono="tinta" style={{ flex: 1 }}>
            {T.agenda.zonasNuevas(f.zonasNuevas)}
          </Texto>
        </View>
      ) : null}
      {/* Esta cena se graba: se dice antes del botón (18-10). */}
      {f.graba ? (
        <View style={[estilos.graba, { marginBottom: 0 }]}>
          <Texto variante="cuerpoChico" tono="terracota" style={{ fontFamily: fuente.textoSemi }}>
            {T.grabacionFecha.titulo}
          </Texto>
          <Texto variante="cuerpoChico" style={{ marginTop: 6 }}>
            {T.grabacionFecha.cuerpo}
          </Texto>
          {p.pidePermiso ? (
            <Pressable
              onPress={p.alPermiso}
              accessibilityRole="checkbox"
              aria-checked={p.permiso}
              style={[estilos.permiso, p.permiso ? { backgroundColor: color.terracota, borderColor: color.terracota } : null]}
            >
              <Texto variante="cuerpo" style={{ fontFamily: fuente.textoMedia, color: p.permiso ? '#FFF8EA' : color.verdeProfundo }}>
                {T.grabacionFecha.permiso(p.permiso)}
              </Texto>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {f.masUno && aviso ? <AvisoCasilla plazo={f.plazo} marcado={entendido} alMarcar={() => setEntendido((x) => !x)} /> : null}
    </ScrollView>
  )

  return (
    <HojaAbajo alCerrar={p.alCerrar} etiquetaCerrar={T.agenda.cancelar} cabecera={cabecera} pie={pie}>
      {cuerpo}
    </HojaAbajo>
  )
}

function IconoReloj() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color.terracota} strokeWidth={2} />
      <Path d="M12 7v5l3 2" stroke={color.terracota} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function Agenda(p: {
  filtros: Filtro[]
  grupos: { semana: string; filas: FilaAgenda[] }[]
  abierta: string | null
  textoReservar: (precio: string, graba: boolean) => string
  reservando?: string | false
  fallo: string
  /** Con crédito: el permiso de grabación se pide en la tarjeta. */
  pidePermiso: boolean
  permiso: boolean
  alPermiso: () => void
  alFiltro: (formato: string) => void
  alAbrir: (id: string) => void
  alConfirmar: (id: string, aceptaCondiciones?: boolean) => void
  /** Sus créditos: alcanzan o no según la fecha (dos en una +1). */
  misCreditos: number
  /** Vive en una ciudad que aún no abre: su nombre. Sin polaroids ni fechas de otra ciudad. */
  ciudadCerrada?: string | null
}) {
  if (p.ciudadCerrada)
    return (
      <View>
        <Texto variante="titulo" accessibilityRole="header" style={{ marginBottom: 12 }}>
          {T.agenda.tituloCiudad(p.ciudadCerrada === 'Otra ciudad' ? 'tu ciudad' : p.ciudadCerrada)}
        </Texto>
        <View style={estilos.vacia}>
          <Texto variante="cuerpo" tono="secundario">
            {T.agenda.ciudadCerrada(p.ciudadCerrada === 'Otra ciudad' ? 'tu ciudad' : p.ciudadCerrada)}
          </Texto>
        </View>
      </View>
    )
  const abierta = p.abierta ? p.grupos.flatMap((g) => g.filas).find((x) => x.id === p.abierta) ?? null : null
  return (
    <View>
      <Texto variante="titulo" accessibilityRole="header" style={{ marginBottom: 12 }}>
        {T.agenda.titulo}
      </Texto>

      {/* Una sola fila que se desliza, de borde a borde, con el margen de la página dentro. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ANCHO_POLAROID + SEPARACION}
        decelerationRate="fast"
        style={estilos.carril}
        contentContainerStyle={estilos.carrilDentro}
      >
        {p.filtros.map((f) => (
          <Polaroid key={f.formato} f={f} alPulsar={() => p.alFiltro(f.formato)} />
        ))}
      </ScrollView>

      {p.grupos.map((g) => (
        <View key={g.semana} style={{ marginBottom: 20 }}>
          <Texto variante="etiquetaChica" style={{ marginBottom: 10 }}>
            {g.semana.toUpperCase()}
          </Texto>
          <View style={{ gap: 9 }}>
            {g.filas.map((f) => (
              <FilaFecha key={f.id} f={f} alAbrir={() => p.alAbrir(f.id)} />
            ))}
          </View>
        </View>
      ))}


      {abierta ? (
        <HojaFecha
          key={abierta.id}
          f={abierta}
          textoReservar={(precio) => p.textoReservar(precio, abierta.graba)}
          reservando={p.reservando}
          fallo={p.fallo}
          pidePermiso={p.pidePermiso}
          permiso={p.permiso}
          alPermiso={p.alPermiso}
          alCerrar={() => p.alAbrir(abierta.id)}
          alConfirmar={(acepta) => p.alConfirmar(abierta.id, acepta)}
          conCredito={p.misCreditos >= abierta.creditos}
        />
      ) : null}

      {p.grupos.length === 0 ? (
        <View style={estilos.vacia}>
          <Texto variante="cuerpo" tono="secundario">
            {T.agenda.vacia}
          </Texto>
        </View>
      ) : null}
    </View>
  )
}

// --- Lo de abajo --------------------------------------------------------------

export function Valorar({ sitio, alPulsar }: { sitio: string | null; alPulsar: () => void }) {
  return (
    <Pressable onPress={alPulsar} accessibilityRole="link" style={({ pressed }) => [estilos.valorar, { backgroundColor: pressed ? color.verde : color.verdeProfundo }]}>
      <Texto variante="etiquetaChica" style={{ color: color.terracotaClara, marginBottom: 10 }}>
        {T.valorar.etiqueta}
      </Texto>
      <Texto variante="subtitulo" tono="crema">
        {T.valorar.titulo(sitio)}
      </Texto>
      <Texto variante="cuerpoChico" tono="cuerpoSobreVerde" style={{ marginTop: 8 }}>
        {T.valorar.cuerpo}
      </Texto>
      <View style={estilos.valorarBoton}>
        <Texto variante="rotulo">{T.valorar.boton}</Texto>
      </View>
    </Pressable>
  )
}

export function LoProximo({ mios, alCancelar, alVerAgenda }: { mios: Proximo[]; alCancelar: () => void; alVerAgenda: () => void }) {
  return (
    <View>
      <Texto variante="titulo" accessibilityRole="header" style={{ marginBottom: 16 }}>
        {T.proximo.titulo}
      </Texto>
      {mios.length ? (
        mios.map((m, i) => (
          <View key={i} style={estilos.mio}>
            <View style={{ flexGrow: 1, flexBasis: 200, minWidth: 0 }}>
              <Texto variante="subtitulo" style={{ fontSize: 20 }}>
                {m.sitio}
              </Texto>
              <Texto variante="nota" style={{ marginTop: 3 }}>
                {m.detalle}
              </Texto>
            </View>
            <Texto variante="nota" style={{ fontFamily: fuente.textoMedia }}>
              {m.cuando}
            </Texto>
            <View style={[estilos.chipEstado, { backgroundColor: m.pendiente ? terracotaAlfa(0.13) : color.verde }]}>
              <Texto variante="chip" style={{ color: m.pendiente ? color.terracota : color.crema }}>
                {m.estado}
              </Texto>
            </View>
            <Pressable onPress={alCancelar} accessibilityRole="link" style={estilos.cancelar}>
              <Texto variante="nota" tono="terracota" style={{ fontFamily: fuente.textoMedia, textDecorationLine: 'underline' }}>
                {T.proximo.cancelar}
              </Texto>
            </Pressable>
          </View>
        ))
      ) : (
        <View style={estilos.sinMios}>
          <Texto variante="subtitulo">{T.proximo.vacioTitulo}</Texto>
          <Texto variante="cuerpo" tono="secundario" style={{ marginTop: 9 }}>
            {T.proximo.vacioCuerpo}
          </Texto>
          <View style={{ marginTop: 18 }}>
            <Boton texto={T.proximo.verLoQueViene} onPress={alVerAgenda} />
          </View>
        </View>
      )}
    </View>
  )
}

export function Atajos({ atajos, alPulsar }: { atajos: Atajo[]; alPulsar: (destino: string) => void }) {
  return (
    <View style={{ gap: 12 }}>
      {atajos.map((a) => (
        <Pressable
          key={a.titulo}
          onPress={() => alPulsar(a.destino)}
          accessibilityRole="link"
          style={({ pressed }) => [estilos.atajo, { opacity: pressed ? 0.75 : 1 }]}
        >
          <Texto variante="subtitulo" style={{ fontSize: 20 }}>
            {a.titulo}
          </Texto>
          <Texto variante="cuerpoChico" tono="secundario" style={{ marginTop: 6 }}>
            {a.cuerpo}
          </Texto>
          <Texto variante="etiqueta" tono="terracota" style={{ fontFamily: fuente.textoSemi, letterSpacing: 0.7, paddingTop: 12 }}>
            {a.pie}
          </Texto>
        </Pressable>
      ))}
    </View>
  )
}

export function Pie({ alPulsar }: { alPulsar: (ruta: string) => void }) {
  return (
    <View style={estilos.pie}>
      {T.pie.map((l) => (
        <EnlacePie key={l.ruta} fondo="crema" texto={l.texto} onPress={() => alPulsar(l.ruta)} />
      ))}
    </View>
  )
}

export function Seccion({ children, arriba = 40, onLayout }: { children: ReactNode; arriba?: number; onLayout?: (y: number) => void }) {
  return (
    <View style={{ marginTop: arriba }} onLayout={onLayout ? (e) => onLayout(e.nativeEvent.layout.y) : undefined}>
      {children}
    </View>
  )
}

const estilos = StyleSheet.create({
  idioma: { height: 22, paddingHorizontal: 10, borderRadius: 999, backgroundColor: color.verde, justifyContent: 'center', alignSelf: 'center' },
  zonas: { flexDirection: 'row', gap: 11, alignItems: 'flex-start', borderRadius: 20, backgroundColor: verdeAlfa(0.08), paddingVertical: 13, paddingHorizontal: 15, marginBottom: 16 },
  zonasIcono: { width: 22, height: 22, borderRadius: 11, backgroundColor: color.verde, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  graba: { borderRadius: 20, backgroundColor: '#FFF8EA', borderWidth: 1, borderColor: 'rgba(143,69,21,.28)', paddingVertical: 16, paddingHorizontal: 18, marginBottom: 16 },
  permiso: { alignSelf: 'flex-start', minHeight: 46, marginTop: 13, paddingHorizontal: 18, borderRadius: radio.capsula, borderWidth: 1, borderColor: 'rgba(20,52,42,.22)', justifyContent: 'center' },
  bloque: { borderRadius: 30, padding: 22 },
  selloFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 16 },
  sello: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radio.capsula },
  reloj: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  relojPunto: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.terracotaSobreVerde },
  mesa: { marginTop: 22, paddingTop: 20, borderTopWidth: 1, borderTopColor: cremaAlfa(0.2) },
  mesaNumero: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: color.crema,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otros: { gap: 10, marginTop: 20, paddingTop: 18, borderTopWidth: 1, borderTopColor: cremaAlfa(0.2) },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  carril: { marginHorizontal: -medida.margenLateral, marginBottom: 14 },
  carrilDentro: { paddingHorizontal: medida.margenLateral, paddingTop: 10, paddingBottom: 16, gap: SEPARACION },
  mosaico: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  mosaicoFoto: { width: '50%', height: '50%' },
  polaroidNombre: { fontFamily: fuente.titular, fontSize: 16, lineHeight: 23, textAlign: 'center', paddingTop: 8 },
  polaroidDetalle: { fontFamily: fuente.textoMedia, fontSize: 11, lineHeight: 14, textAlign: 'center', paddingTop: 3, paddingBottom: 9, color: '#566A5D' },
  polaroid: {
    backgroundColor: color.cremaElevada,
    paddingHorizontal: 6,
    paddingTop: 6,
    borderWidth: 2,
    borderRadius: 10,
    shadowColor: color.verdeProfundo,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  polaroidFoto: { aspectRatio: 1, overflow: 'hidden', borderRadius: 6, backgroundColor: '#DCD3BC' },
  verTodo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    minHeight: medida.toqueMinimo,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderRadius: radio.capsula,
    borderWidth: 1,
    borderColor: tinta(0.2),
  },
  hojaPie: { gap: 10, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: tinta(0.12), backgroundColor: color.crema },
  fecha: { flexDirection: 'row', gap: 13, alignItems: 'flex-start', borderRadius: radio.tarjeta, padding: 15, borderWidth: 1 },
  fechaIcono: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  barraFondo: { flex: 1, minWidth: 56, maxWidth: 132, height: 5, borderRadius: 3, backgroundColor: tinta(0.13), overflow: 'hidden' },
  barra: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },
  flecha: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  hora: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    alignSelf: 'flex-start',
    minHeight: 46,
    paddingLeft: 12,
    paddingRight: 16,
    marginBottom: 18,
    borderRadius: radio.capsula,
    backgroundColor: color.crema,
    borderWidth: 1,
    borderColor: color.terracota,
  },
  horaAro: { width: 18, height: 18, borderRadius: 9, backgroundColor: color.terracotaRelleno, alignItems: 'center', justifyContent: 'center' },
  cargo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    alignItems: 'baseline',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: tinta(0.12),
    marginBottom: 16,
  },
  vacia: { borderRadius: radio.tarjeta, borderWidth: 1, borderStyle: 'dashed', borderColor: tinta(0.26), padding: 20 },
  valorar: { borderRadius: 26, padding: 20 },
  valorarBoton: {
    alignSelf: 'flex-start',
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 22,
    borderRadius: radio.capsula,
    backgroundColor: color.crema,
    marginTop: 16,
  },
  mio: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 16,
    rowGap: 6,
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: tinta(0.13),
  },
  chipEstado: { minHeight: 30, justifyContent: 'center', paddingHorizontal: 12, borderRadius: radio.capsula },
  cancelar: { minHeight: medida.toqueMinimo, justifyContent: 'center', paddingHorizontal: 12 },
  sinMios: { borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', borderColor: tinta(0.26), padding: 22 },
  atajo: { borderRadius: radio.tarjeta, backgroundColor: color.cremaElevada, padding: 17, minHeight: 112 },
  pie: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 30, paddingTop: 24, borderTopWidth: 1, borderTopColor: tinta(0.13) },
})
