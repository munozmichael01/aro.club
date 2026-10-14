import { openBrowserAsync } from 'expo-web-browser'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Boton, Texto, color, medida, tinta } from '../diseno'
import Constants from 'expo-constants'
import * as T from '../texto/normas'

const SITIO = (Constants.expoConfig?.extra as { sitio: string }).sitio

/**
 * /normas: tolerancia cero, reportar y bloquear (Apple 1.2, 14-10-2026). Se
 * llega desde los enlaces legales; no es obligatoria.
 */
export function Normas({ alVolver }: { alVolver: () => void }) {
  const insets = useSafeAreaInsets()
  const L = T.normas.legal
  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.crema }} contentContainerStyle={[estilos.pagina, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 }]}>
      <Texto variante="titularGrande">{T.normas.titulo}</Texto>
      <Texto variante="cuerpoGrande" tono="secundario" style={{ marginTop: 12 }}>{T.normas.bajada}</Texto>
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
      <View style={{ marginTop: 28 }}>
        <Boton tipo="secundario" texto={T.normas.volver} ancho onPress={alVolver} />
      </View>
    </ScrollView>
  )
}

const estilos = StyleSheet.create({
  pagina: { paddingHorizontal: medida.margenLateral, maxWidth: 560, width: '100%', alignSelf: 'center' },
  punto: { marginTop: 22, paddingTop: 18, borderTopWidth: 1, borderTopColor: tinta(0.12) },
  enlace: { textDecorationLine: 'underline' },
})
