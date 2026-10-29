import { useFocusEffect } from 'expo-router'
import { useCallback, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AroCarga, Aviso, Boton, IconoFlecha, Marca, Opcion, Texto, color, fuente, medida, radio, tinta } from '../diseno'
import * as T from '../texto/cambiar'
import { useUltimo } from '../util/useUltimo'
import * as M from './maquina'
import type { Datos, crearServicioCambiar } from './servicio'

type Servicio = ReturnType<typeof crearServicioCambiar>

/**
 * Cambiar de fecha (`/cambiar-fecha`), del bloque `cambiarFecha` de Mi mesa.
 * Fuera de las pestañas, como Cancelar: es un flujo con principio y final.
 * Sin maqueta de Design todavía: usa las piezas de Cancelar.
 */
export function CambiarFecha(p: { servicio: Servicio; ir: (d: string) => void; alEntrar: () => void }) {
  const insets = useSafeAreaInsets()
  const { servicio } = p
  const alEntrar = useUltimo(p.alEntrar)
  const [d, setD] = useState<Datos | null>(null)
  const [fallo, setFallo] = useState('')
  const [elegida, setElegida] = useState<string | null>(null)
  const [cambiando, setCambiando] = useState(false)
  const [hecho, setHecho] = useState<{ antes: M.Destino; ahora: M.Destino } | null>(null)

  const cargar = useCallback(async () => {
    const r = await servicio.leer()
    if (r.ok) {
      setD(r.datos)
      setFallo('')
    } else if (r.status === 401) alEntrar.current()
    else setFallo(r.error)
  }, [servicio, alEntrar])

  useFocusEffect(
    useCallback(() => {
      if (!hecho) cargar()
    }, [cargar, hecho]),
  )

  const cambiar = async () => {
    if (!d || cambiando) return
    if (!elegida) return setFallo(T.elegir.eligeUna)
    setCambiando(true)
    setFallo('')
    const r = await servicio.cambiar(d.reservaId, elegida)
    setCambiando(false)
    if (!r.ok) {
      if (r.status === 401) return alEntrar.current()
      // El servidor dice por qué con sus palabras; y relee, que lo ofrecido pudo cambiar.
      setFallo(r.error)
      return cargar()
    }
    const ahora = d.bloque.destinos.find((x) => x.eventoId === elegida)
    if (ahora) setHecho({ antes: deAhora(d), ahora })
  }

  let cuerpo: ReactNode
  if (hecho) {
    const antes = M.fila(hecho.antes)
    const ahora = M.fila(hecho.ahora)
    cuerpo = (
      <View>
        <View style={estilos.sello}>
          <Texto variante="etiquetaChica" tono="crema" style={{ fontFamily: fuente.textoSemi, letterSpacing: 1.4 }}>
            {T.hecho.sello}
          </Texto>
        </View>
        <Texto variante="portada" accessibilityRole="header">
          {T.hecho.titulo(M.diaDe(hecho.ahora))}
        </Texto>
        <View style={[estilos.caja, { marginTop: 24 }]}>
          <Texto variante="etiquetaChica" tono="cuerpo" style={{ marginBottom: 6 }}>
            {T.hecho.antes}
          </Texto>
          <Texto variante="cuerpo" style={{ color: tinta(0.5), textDecorationLine: 'line-through' }}>
            {[antes.titulo, antes.formato].filter(Boolean).join(' · ')}
          </Texto>
          <View style={{ height: 1, backgroundColor: tinta(0.12), marginVertical: 16 }} />
          <Texto variante="etiquetaChica" tono="cuerpo" style={{ marginBottom: 6 }}>
            {T.hecho.ahora}
          </Texto>
          <Texto variante="subtitulo" style={{ fontSize: 21 }}>
            {ahora.titulo}
          </Texto>
          <Texto variante="cuerpoChico" style={{ fontFamily: fuente.textoMedia, marginTop: 4 }}>
            {[ahora.detalle, ahora.ingles ? T.elegir.enIngles : ''].filter(Boolean).join(' · ')}
          </Texto>
        </View>
        <Texto variante="cuerpoGrande" style={{ marginTop: 18 }}>
          {T.hecho.cuerpo}
        </Texto>
        <View style={estilos.acciones}>
          <Boton ancho texto={T.hecho.verMesa} onPress={() => p.ir('/mesa')} />
        </View>
      </View>
    )
  } else if (d) {
    const actual = M.fila(deAhora(d))
    const nota = d.bloque.puede && d.bloque.destinos.length ? null : T.noSePuede(d.bloque.puede ? 'sin-destinos' : d.bloque.motivo)
    cuerpo = (
      <View>
        <Texto variante="portada" accessibilityRole="header">
          {T.elegir.titulo}
        </Texto>
        <Texto variante="cuerpoGrande" style={{ marginTop: 14 }}>
          {T.elegir.bajada}
        </Texto>
        <View style={[estilos.caja, { marginTop: 26 }]}>
          <Texto variante="etiquetaChica" tono="cuerpo" style={{ marginBottom: 10 }}>
            {T.elegir.ahora}
          </Texto>
          <Texto variante="subtitulo" style={{ fontSize: 21 }}>
            {actual.titulo}
          </Texto>
          <Texto variante="cuerpoChico" style={{ fontFamily: fuente.textoMedia, marginTop: 4 }}>
            {actual.detalle}
          </Texto>
        </View>
        {nota ? (
          <View style={{ marginTop: 18 }}>
            <Aviso tono="ojo">{nota}</Aviso>
          </View>
        ) : (
          <>
            <Texto variante="etiqueta" tono="cuerpo" style={{ letterSpacing: 1.9, marginTop: 30, marginBottom: 14 }}>
              {T.elegir.nuevas}
            </Texto>
            <View style={{ gap: 8 }}>
              {d.bloque.destinos.map((x) => {
                const f = M.fila(x, false)
                return (
                  <Opcion
                    key={x.eventoId}
                    unica
                    texto={f.titulo}
                    pie={[f.detalle, f.ingles ? T.elegir.enIngles : ''].filter(Boolean).join(' · ')}
                    marcada={elegida === x.eventoId}
                    onPress={() => (setElegida(x.eventoId), setFallo(''))}
                  />
                )
              })}
            </View>
          </>
        )}
        {fallo ? (
          <View style={{ marginTop: 16 }}>
            <Aviso tono="ojo">{fallo}</Aviso>
          </View>
        ) : null}
        <View style={estilos.acciones}>
          {nota ? null : <Boton ancho texto={T.elegir.boton(cambiando)} onPress={cambiar} apagado={cambiando || !elegida} />}
          <Boton ancho tipo="secundario" texto={T.elegir.quedarme} onPress={() => p.ir('/mesa')} />
        </View>
      </View>
    )
  } else if (fallo) {
    cuerpo = (
      <View style={{ gap: 16 }}>
        <Aviso tono="ojo">{fallo}</Aviso>
        <Boton tipo="secundario" texto={T.sinRespuesta.reintentar} onPress={() => (setFallo(''), cargar())} />
        <Boton tipo="fantasma" texto={T.sinRespuesta.volver} onPress={() => p.ir('/mesa')} />
      </View>
    )
  } else {
    cuerpo = <AroCarga tam={36} />
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.crema }}>
      <ScrollView contentContainerStyle={[estilos.pagina, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 48 }]}>
        <Pressable onPress={() => p.ir('/mesa')} accessibilityRole="link" accessibilityLabel={T.sinRespuesta.volver} style={estilos.volver}>
          <View style={{ transform: [{ rotate: '180deg' }] }}>
            <IconoFlecha tam={16} color={color.cuerpo} />
          </View>
          <Marca tam={22} />
          <Texto variante="marca">Aro Club</Texto>
        </Pressable>
        {cuerpo}
      </ScrollView>
    </View>
  )
}

/** La fecha de ahora, con la misma forma que un destino. */
const deAhora = (d: Datos): M.Destino => ({ eventoId: '', empiezaEn: d.empiezaEn ?? '', zonaHoraria: d.zonaHoraria, formato: d.formato, zonas: d.zonas })

const estilos = StyleSheet.create({
  pagina: { paddingHorizontal: medida.margenLateral, maxWidth: 620, width: '100%', alignSelf: 'center' },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: medida.toqueMinimo, alignSelf: 'flex-start', marginBottom: 22 },
  caja: { borderRadius: 26, backgroundColor: color.cremaElevada, padding: 20 },
  acciones: { gap: 12, marginTop: 28 },
  sello: { alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center', paddingHorizontal: 15, borderRadius: radio.capsula, backgroundColor: color.verdeProfundo, marginBottom: 16 },
})
