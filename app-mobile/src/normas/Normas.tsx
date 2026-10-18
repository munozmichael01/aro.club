import { openBrowserAsync } from 'expo-web-browser'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useState } from 'react'

import { Aviso, Boton, Texto, color, medida, tinta } from '../diseno'
import { Acepto } from './Acepto'
import Constants from 'expo-constants'
import * as T from '../texto/normas'

const SITIO = (Constants.expoConfig?.extra as { sitio: string }).sitio

/**
 * /normas: tolerancia cero, reportar y bloquear (Apple 1.2, 14-10-2026). Se
 * llega desde los enlaces legales; no es obligatoria.
 *
 * Con `aceptar` es la puerta de después de entrar (18-10): a quien su cuenta
 * no las aceptó nunca, una sola vez, con la casilla y «Continuar».
 */
export function Normas(p: { alVolver?: () => void; aceptar?: { alAceptar: () => void; aceptando: boolean; fallo: string } }) {
  const insets = useSafeAreaInsets()
  const L = T.normas.legal
  const [marcada, setMarcada] = useState(false)
  const a = p.aceptar
  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.crema }} contentContainerStyle={[estilos.pagina, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 }]}>
      {a ? (
        <Texto variante="etiqueta" tono="terracota" style={{ letterSpacing: 1.8, marginBottom: 10 }}>
          {T.puerta.cinta}
        </Texto>
      ) : null}
      <Texto variante="titularGrande">{T.normas.titulo}</Texto>
      <Texto variante="cuerpoGrande" tono="secundario" style={{ marginTop: 12 }}>{T.normas.bajada}</Texto>
      {a ? (
        <Texto variante="cuerpo" style={{ marginTop: 10 }}>
          {T.puerta.contexto}
        </Texto>
      ) : null}
      {T.normas.puntos.map((x) => (
        <View key={x.titulo} style={estilos.punto}>
          <Texto variante="rotulo">{x.titulo}</Texto>
          <Texto variante="cuerpo" tono="secundario" style={{ marginTop: 4 }}>{x.texto}</Texto>
        </View>
      ))}
      <Texto variante="nota" style={{ marginTop: 22 }}>
        {L.antes}
        <Texto variante="nota" tono="verde" style={estilos.enlace} onPress={() => openBrowserAsync(`${SITIO}/terminos`)}>{L.terminos}</Texto>
        {L.medio}
        <Texto variante="nota" tono="verde" style={estilos.enlace} onPress={() => openBrowserAsync(`${SITIO}/privacidad`)}>{L.privacidad}</Texto>
        {L.despues}
      </Texto>
      {a ? (
        // La puerta de después de entrar (18-10): una vez por cuenta, y sin aceptar no se pasa.
        <View style={{ marginTop: 28, gap: 16 }}>
          <Acepto fondo="crema" marcada={marcada} alCambiar={setMarcada} />
          {a.fallo ? <Aviso tono="ojo">{a.fallo}</Aviso> : null}
          <Boton texto={a.aceptando ? T.puerta.guardando : marcada ? T.puerta.continuar : T.acepto.falta} ancho onPress={a.alAceptar} apagado={!marcada || a.aceptando} />
        </View>
      ) : (
        <View style={{ marginTop: 28 }}>
          <Boton tipo="secundario" texto={T.normas.volver} ancho onPress={p.alVolver} />
        </View>
      )}
    </ScrollView>
  )
}

const estilos = StyleSheet.create({
  pagina: { paddingHorizontal: medida.margenLateral, maxWidth: 560, width: '100%', alignSelf: 'center' },
  punto: { marginTop: 22, paddingTop: 18, borderTopWidth: 1, borderTopColor: tinta(0.12) },
  enlace: { textDecorationLine: 'underline' },
})
