import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import { ImageBackground, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Boton, Enfasis, Marca, Texto, medida, tinta } from '../diseno'
import * as T from '../texto/entrada'

/**
 * Lo primero que se ve al abrir la app sin sesión. Una pantalla quieta, al
 * modo de Meetup (decisión del 27-09): la foto del hero de la web a sangre,
 * el titular, y Empezar y Entrar igual de visibles —quien reinstala entra
 * por la segunda—. Nada que vender: eso lo hace la web.
 *
 * La foto es `assets/fotos/portada.jpg`, con el filtro del hero cocido por
 * `scripts/cocer-foto.py` (la app no tiene filtros CSS). El degradado es el
 * de la web, con la tinta del sistema.
 *
 * El video de fondo (Timeleft, 222) queda para cuando haya material de una
 * cena real; con banco de imágenes, no.
 */
export function Bienvenida({ onEmpezar, onEntrar }: { onEmpezar: () => void; onEntrar: () => void }) {
  const insets = useSafeAreaInsets()
  const t = T.titular
  return (
    <ImageBackground
      source={require('../../assets/fotos/portada.jpg')}
      resizeMode="cover"
      style={estilos.fondo}
      imageStyle={{ transform: [{ scale: 1.08 }] }}
      accessibilityIgnoresInvertColors
    >
      <StatusBar style="light" />
      <LinearGradient colors={[tinta(0.42), tinta(0.72), tinta(0.94)]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <View style={[estilos.contenido, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
        <View style={estilos.marca}>
          <Marca sobreVerde />
          <Texto variante="marca" tono="crema">
            Aro Club
          </Texto>
        </View>
        <View style={{ gap: 30 }}>
          <Texto variante="portada" tono="crema" accessibilityRole="header">
            {t.linea}
            {'\n'}
            <Enfasis sobreVerde>{t.enfasis}</Enfasis>
          </Texto>
          <View style={{ gap: 12 }}>
            <Boton tipo="sobreVerde" texto={T.bienvenida.empezar} ancho onPress={onEmpezar} />
            <Boton tipo="secundarioSobreVerde" texto={T.bienvenida.entrar} ancho onPress={onEntrar} />
          </View>
        </View>
      </View>
    </ImageBackground>
  )
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, overflow: 'hidden' },
  contenido: { flex: 1, justifyContent: 'space-between', paddingHorizontal: medida.margenLateral, maxWidth: 560, width: '100%', alignSelf: 'center' },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: medida.toqueMinimo },
})
