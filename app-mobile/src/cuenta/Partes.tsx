import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AccessibilityInfo, Animated, Image, Pressable, StyleSheet, View } from 'react-native'

import {
  Aviso,
  Boton,
  EnlacePie,
  ICONO_FORMATO,
  IconoCheck,
  IconoCruz,
  IconoFlecha,
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
  verdeAlfa,
} from '../diseno'
import * as F from '../texto/fechas'
import * as T from '../texto/cuenta'
import type { Atajo, FilaAgenda, Filtro, Proximo, Tarjeta } from './maquina'

/**
 * Las piezas del Inicio, calcadas de `Mi cuenta.dc.html`. Solo pintan: los
 * datos llegan ya calculados de `maquina.ts`.
 */

// --- Movimiento que respeta «reducir movimiento» ----------------------------

function useReducirMovimiento() {
  const [r, setR] = useState(false)
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setR).catch(() => {})
    const s = AccessibilityInfo.addEventListener('reduceMotionChanged', setR)
    return () => s.remove()
  }, [])
  return r
}

/** El latido de los huesos y del punto del reloj: opacidad que va y viene. */
function useLatido(desde: number, hasta: number, ms: number) {
  const v = useRef(new Animated.Value(desde)).current
  const quieto = useReducirMovimiento()
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

/** Un esqueleto con la forma del bloque que viene, no un spinner: el salto se nota más que la espera. */
export function Esqueleto() {
  const o = useLatido(0.55, 0.28, 1500)
  const h = (alto: number, ancho: number | `${number}%`, extra?: object) => (
    <Animated.View style={[{ height: alto, width: ancho, maxWidth: '100%', backgroundColor: tinta(0.09), borderRadius: 8, opacity: o }, extra]} />
  )
  return (
    <View aria-busy accessibilityLabel={T.sinRespuesta.cargando}>
      {h(34, 150, { marginBottom: 22 })}
      <View style={[estilos.bloque, { backgroundColor: color.cremaElevada }]}>
        {h(30, 140, { borderRadius: radio.capsula, marginBottom: 16 })}
        {h(34, '100%', { marginBottom: 8 })}
        {h(34, '62%', { marginBottom: 20 })}
        {h(15, '100%', { marginBottom: 9 })}
        {h(15, '100%', { marginBottom: 9 })}
        {h(15, '48%', { marginBottom: 26 })}
        {h(56, 170, { borderRadius: radio.capsula })}
      </View>
    </View>
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
            <View style={estilos.mesaNumero}>
              <Texto variante="etiquetaChica" tono="secundario" style={{ fontSize: 9 }}>
                {T.mesa.etiqueta}
              </Texto>
              <Texto variante="cifra">{t.mesa.numero}</Texto>
            </View>
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
}
const GIRO: Record<string, string> = { dinner: '-1.8deg', drinks: '1.5deg', movement: '-1.3deg', coffee: '1.6deg' }

/** La polaroid ES el filtro: el elemento con más fuerza de la marca hace de navegación. */
function Polaroid({ f, algunoElegido, alPulsar }: { f: Filtro; algunoElegido: boolean; alPulsar: () => void }) {
  const viva = !algunoElegido || f.elegido
  return (
    <Pressable
      onPress={f.hay ? alPulsar : undefined}
      accessibilityRole="button"
      aria-disabled={!f.hay}
      aria-selected={f.elegido}
      accessibilityLabel={`${f.nombre}. ${f.detalle}`}
      style={[
        estilos.polaroid,
        {
          borderColor: f.elegido ? color.terracota : 'transparent',
          opacity: f.hay ? 1 : 0.62,
          transform: [{ rotate: f.elegido ? '0deg' : GIRO[f.formato] }, { scale: f.elegido ? 1.03 : 1 }],
        },
      ]}
    >
      <View style={estilos.polaroidFoto}>
        <Image source={viva ? FOTOS[f.formato].on : FOTOS[f.formato].off} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: verdeAlfa(0.23) }]} />
      </View>
      <Texto variante="rotulo" style={{ fontFamily: fuente.titular, fontSize: 16, textAlign: 'center', paddingTop: 9, color: f.elegido ? color.terracota : color.verdeProfundo }}>
        {f.nombre}
      </Texto>
      <Texto variante="etiqueta" tono={f.hay ? 'secundario' : 'terracota'} style={{ letterSpacing: 0, textAlign: 'center', paddingTop: 4, paddingBottom: 10 }}>
        {f.detalle}
      </Texto>
    </Pressable>
  )
}

const MARCAS: Record<string, { tinta: string; fondo: string }> = {
  dinner: { tinta: color.terracota, fondo: 'rgba(192,102,47,.14)' },
  drinks: { tinta: color.verde, fondo: verdeAlfa(0.12) },
  movement: { tinta: '#2D6A4F', fondo: 'rgba(45,106,79,.14)' },
  coffee: { tinta: color.secundario, fondo: 'rgba(86,106,93,.14)' },
}

function FilaFecha(p: {
  f: FilaAgenda
  abierta: boolean
  textoReservar: string
  alAbrir: () => void
  alConfirmar: () => void
  precio: string
  fallo: string
}) {
  const { f, abierta } = p
  const m = MARCAS[f.formato]
  const Icono = ICONO_FORMATO[f.formato as keyof typeof ICONO_FORMATO]
  const quieta = f.mia || f.cerrada
  return (
    <View style={{ borderRadius: radio.tarjeta, overflow: 'hidden', backgroundColor: abierta ? color.cremaFria : 'transparent' }}>
      <Pressable
        onPress={quieta ? undefined : p.alAbrir}
        accessibilityRole="button"
        aria-expanded={abierta}
        aria-disabled={quieta}
        style={[
          estilos.fecha,
          {
            opacity: f.cerrada ? 0.58 : 1,
            backgroundColor: f.mia ? 'transparent' : abierta ? color.cremaFria : color.cremaElevada,
            borderColor: f.mia ? color.verde : 'transparent',
          },
        ]}
      >
        <View style={[estilos.fechaIcono, { backgroundColor: f.mia ? color.verde : m.fondo }]}>
          {f.cerrada ? <IconoPunto color={m.tinta} /> : f.mia ? <IconoCheck color={color.crema} /> : <Icono color={m.tinta} />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 9, rowGap: 2, alignItems: 'baseline' }}>
            <Texto variante="rotulo">{f.tipo}</Texto>
            <Texto variante="cuerpoChico" tono="secundario">
              {f.cuando}
            </Texto>
          </View>
          <Texto variante="nota" style={{ marginTop: 3 }}>
            {f.zona}
          </Texto>
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
        </View>
        {quieta ? null : (
          <View style={[estilos.flecha, { backgroundColor: abierta ? color.terracota : color.verdeProfundo }]}>
            {abierta ? <IconoCruz color={color.crema} /> : <IconoFlecha color={color.crema} />}
          </View>
        )}
      </Pressable>

      {abierta ? (
        <View style={{ paddingHorizontal: 15, paddingBottom: 16 }}>
          <View style={{ height: 1, backgroundColor: tinta(0.12), marginBottom: 16 }} />
          <Texto variante="etiquetaChica" style={{ marginBottom: 11 }}>
            {T.agenda.eligeHora}
          </Texto>
          {/* Una hora: la de la fecha. Nadie elige turno; si un día hay dos, serán dos fechas. */}
          <View style={estilos.hora} aria-checked accessibilityRole="radio">
            <View style={estilos.horaAro}>
              <IconoCheck tam={11} color={color.sobreTerracota} />
            </View>
            <Texto variante="rotulo">{f.hora}</Texto>
          </View>
          <View style={estilos.cargo}>
            <Texto variante="cuerpoChico" tono="tinta" style={{ flex: 1, fontFamily: fuente.textoMedia }}>
              {T.agenda.cargo}
            </Texto>
            <Texto variante="cuerpoChico" tono="verde" style={{ fontFamily: fuente.textoSemi }}>
              {p.precio}
            </Texto>
          </View>
          <Texto variante="nota" style={{ marginBottom: 16 }}>
            {T.agenda.nota}
          </Texto>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 11, alignItems: 'center' }}>
            <Boton texto={p.textoReservar} onPress={p.alConfirmar} />
            <Boton tipo="fantasma" texto={T.agenda.cancelar} onPress={p.alAbrir} />
          </View>
          {/* El «no» del servidor, JUNTO al botón: debajo de la agenda (como la web) quedaba fuera de la pantalla. */}
          {p.fallo ? (
            <View style={{ marginTop: 12 }}>
              <Aviso tono="ojo">{p.fallo}</Aviso>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

export function Agenda(p: {
  filtros: Filtro[]
  grupos: { semana: string; filas: FilaAgenda[] }[]
  cuandoSeSabe: string
  abierta: string | null
  textoReservar: string
  precio: string
  fallo: string
  alFiltro: (formato: string) => void
  alQuitarFiltro: () => void
  alAbrir: (id: string) => void
  alConfirmar: (id: string) => void
}) {
  const algunoElegido = p.filtros.some((f) => f.elegido)
  return (
    <View>
      <Texto variante="titulo" accessibilityRole="header" style={{ marginBottom: 12 }}>
        {T.agenda.titulo}
      </Texto>
      <Texto variante="cuerpo" tono="secundario" style={{ marginBottom: 18 }}>
        {T.agenda.intro}{' '}
        <Texto variante="cuerpo" tono="tinta" style={{ fontFamily: fuente.textoSemi }}>
          {T.agenda.introEnfasis}
        </Texto>{' '}
        {T.agenda.introResto(p.cuandoSeSabe)}
      </Texto>

      <View style={estilos.polaroids}>
        {p.filtros.map((f) => (
          <View key={f.formato} style={{ width: '47%' }}>
            <Polaroid f={f} algunoElegido={algunoElegido} alPulsar={() => p.alFiltro(f.formato)} />
          </View>
        ))}
      </View>
      {algunoElegido ? (
        <Pressable onPress={p.alQuitarFiltro} accessibilityRole="button" style={estilos.verTodo}>
          <IconoCruz tam={12} color={color.verde} />
          <Texto variante="cuerpoChico" tono="verde" style={{ fontFamily: fuente.textoMedia }}>
            {T.agenda.verTodo}
          </Texto>
        </Pressable>
      ) : null}

      {p.grupos.map((g) => (
        <View key={g.semana} style={{ marginBottom: 20 }}>
          <Texto variante="etiquetaChica" style={{ marginBottom: 10 }}>
            {g.semana.toUpperCase()}
          </Texto>
          <View style={{ gap: 9 }}>
            {g.filas.map((f) => (
              <FilaFecha
                key={f.id}
                f={f}
                abierta={p.abierta === f.id}
                textoReservar={p.textoReservar}
                precio={p.precio}
                fallo={p.abierta === f.id ? p.fallo : ''}
                alAbrir={() => p.alAbrir(f.id)}
                alConfirmar={() => p.alConfirmar(f.id)}
              />
            ))}
          </View>
        </View>
      ))}


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
  polaroids: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14, marginBottom: 20 },
  polaroid: {
    backgroundColor: color.cremaElevada,
    paddingHorizontal: 8,
    paddingTop: 8,
    borderWidth: 1,
    borderRadius: 12,
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
