import { useFocusEffect } from 'expo-router'
import { useCallback, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AroCarga, Aviso, Boton, IconoFlecha, Marca, Opcion, Texto, color, fuente, medida, radio } from '../diseno'
import * as T from '../texto/cancelar'
import { useUltimo } from '../util/useUltimo'
import * as M from './maquina'
import type { crearServicioCancelar } from './servicio'

type Servicio = ReturnType<typeof crearServicioCancelar>

/**
 * Cancelar (`/cancelar`), calcado de `Cancelar.dc.html`: con margen o con
 * menos de 24 h (lo decide el servidor), el porqué opcional, y el hecho con
 * los créditos de verdad.
 */
export function Cancelar(p: { reserva?: string | null; servicio: Servicio; ir: (d: string) => void; alEntrar: () => void }) {
  const insets = useSafeAreaInsets()
  const { servicio, reserva } = p
  const alEntrar = useUltimo(p.alEntrar)
  const [d, setD] = useState<M.DeServidor | null>(null)
  const [fallo, setFallo] = useState('')
  const [motivo, setMotivo] = useState(-1)
  const [cancelando, setCancelando] = useState(false)
  const [hecho, setHecho] = useState<{ tarde: boolean; creditos: number | null } | null>(null)

  const cargar = useCallback(async () => {
    const r = await servicio.leer(reserva)
    if (r.ok) {
      setD(r.datos)
      setFallo('')
    } else if (r.status === 401) alEntrar.current()
    else setFallo(r.error)
  }, [servicio, reserva, alEntrar])

  useFocusEffect(
    useCallback(() => {
      if (!hecho) cargar()
    }, [cargar, hecho]),
  )

  const cancelar = async () => {
    if (!d || cancelando) return
    setCancelando(true)
    setFallo('')
    const r = await servicio.cancelar(d.reservaId, motivo >= 0 ? T.preguntar.motivos[motivo] : null)
    if (!r.ok) {
      setCancelando(false)
      // La web lo guardaba y no lo pintaba: aquí se dice.
      return setFallo(r.error)
    }
    const creditos = await servicio.creditos()
    setCancelando(false)
    setHecho({ tarde: !r.datos.creditoDevuelto, creditos })
  }

  let cuerpo: ReactNode
  if (hecho && d) {
    const c = M.queCena(d)
    cuerpo = (
      <View>
        <View style={estilos.sello}>
          <Texto variante="etiquetaChica" tono="crema" style={{ fontFamily: fuente.textoSemi, letterSpacing: 1.4 }}>
            {T.hecho.sello}
          </Texto>
        </View>
        <Texto variante="portada" accessibilityRole="header">
          {T.hecho.titulo(c.dia)}
        </Texto>
        <Texto variante="cuerpoGrande" style={{ marginTop: 14 }}>
          {T.hecho.resumen(hecho.tarde)}
        </Texto>
        {hecho.creditos != null ? (
          <View style={[estilos.caja, { marginTop: 26 }]}>
            <Texto variante="etiquetaChica" tono="cuerpo" style={{ marginBottom: 16 }}>
              {T.hecho.tusCreditos}
            </Texto>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
              <Texto variante="cifra" style={{ fontSize: 34, lineHeight: 42 }}>
                {hecho.creditos}
              </Texto>
              <Texto variante="cuerpoGrande">{T.hecho.disponibles}</Texto>
            </View>
            {/* «No caducan, úsalos cuando quieras» sobre un cero no dice nada. */}
            {hecho.creditos > 0 ? (
              <Texto variante="cuerpoChico" style={{ marginTop: 10 }}>
                {T.hecho.noCaducan}
              </Texto>
            ) : null}
          </View>
        ) : null}
        <View style={estilos.acciones}>
          <Boton texto={T.hecho.otrasFechas} onPress={() => p.ir('/cuenta')} />
          <Boton tipo="fantasma" texto={T.hecho.irCuenta} onPress={() => p.ir('/cuenta')} />
        </View>
      </View>
    )
  } else if (d) {
    const tarde = !d.conMargen
    const c = M.queCena(d)
    cuerpo = (
      <View>
        <Texto variante="portada" accessibilityRole="header">
          {T.preguntar.titulo}
        </Texto>
        <Texto variante="cuerpoGrande" style={{ marginTop: 14 }}>
          {T.preguntar.bajada(tarde)}
        </Texto>
        <View style={[estilos.caja, { marginTop: 26 }]}>
          <View style={estilos.linea}>
            <Texto variante="subtitulo" style={{ fontSize: 22, flexGrow: 1, flexShrink: 1 }}>
              {c.titulo}
            </Texto>
            <Texto variante="cuerpoChico" style={{ fontFamily: fuente.textoMedia }}>
              {c.detalle}
            </Texto>
          </View>
          <View style={{ height: 1, backgroundColor: 'rgba(20,52,42,.12)', marginVertical: 16 }} />
          <View style={estilos.linea}>
            <Texto variante="cuerpo" style={{ flexGrow: 1 }}>
              {T.preguntar.tuCredito}
            </Texto>
            <Texto variante="rotulo" style={{ fontSize: 16, color: tarde ? '#6E340F' : color.verde }}>
              {T.preguntar.credito(tarde)}
            </Texto>
          </View>
        </View>
        <View style={{ marginTop: 14 }}>
          <Aviso tono={tarde ? 'ojo' : 'exito'}>{T.preguntar.aviso(tarde)}</Aviso>
        </View>
        <Texto variante="etiqueta" tono="cuerpo" style={{ letterSpacing: 1.9, marginTop: 30, marginBottom: 6 }}>
          {T.preguntar.porQue}
        </Texto>
        <Texto variante="cuerpoChico" style={{ marginBottom: 14 }}>
          {T.preguntar.porQueNota}
        </Texto>
        <View style={{ gap: 8 }}>
          {T.preguntar.motivos.map((m, i) => (
            <Opcion key={m} unica texto={m} marcada={motivo === i} onPress={() => setMotivo(motivo === i ? -1 : i)} />
          ))}
        </View>
        {fallo ? (
          <View style={{ marginTop: 16 }}>
            <Aviso tono="ojo">{fallo}</Aviso>
          </View>
        ) : null}
        <View style={estilos.acciones}>
          <Boton tipo={tarde ? 'grave' : 'primario'} texto={T.preguntar.si(cancelando)} onPress={cancelar} apagado={cancelando} />
          <Boton tipo="fantasma" texto={T.preguntar.mantener} onPress={() => p.ir('/cuenta')} />
        </View>
      </View>
    )
  } else if (fallo) {
    cuerpo = (
      <View style={{ gap: 16 }}>
        <Aviso tono="ojo">{fallo}</Aviso>
        <Boton tipo="secundario" texto={T.sinRespuesta.reintentar} onPress={() => (setFallo(''), cargar())} />
        <Boton tipo="fantasma" texto={T.sinRespuesta.volver} onPress={() => p.ir('/cuenta')} />
      </View>
    )
  } else {
    cuerpo = <AroCarga tam={36} />
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.crema }}>
      <ScrollView contentContainerStyle={[estilos.pagina, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 48 }]}>
        <Pressable onPress={() => p.ir('/cuenta')} accessibilityRole="link" accessibilityLabel={T.sinRespuesta.volver} style={estilos.volver}>
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

const estilos = StyleSheet.create({
  pagina: { paddingHorizontal: medida.margenLateral, maxWidth: 620, width: '100%', alignSelf: 'center' },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: medida.toqueMinimo, alignSelf: 'flex-start', marginBottom: 22 },
  caja: { borderRadius: 26, backgroundColor: color.cremaElevada, padding: 20 },
  linea: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 6, alignItems: 'baseline' },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 13, alignItems: 'center', marginTop: 28 },
  sello: { alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center', paddingHorizontal: 15, borderRadius: radio.capsula, backgroundColor: color.verdeProfundo, marginBottom: 16 },
})
