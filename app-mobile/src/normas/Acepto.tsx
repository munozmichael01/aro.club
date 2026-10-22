import { router } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import { Texto, color, cremaAlfa, tinta } from '../diseno'
import { acepto as T } from '../texto/normas'


/**
 * La casilla «Acepto las normas de seguridad y los Términos» (Apple 1.2,
 * 14-10-2026). Sin marcarla no se puede entrar ni crear cuenta. Los dos
 * enlaces abren las normas (dentro de la app) y los términos (la web).
 */
export function Acepto(p: { marcada: boolean; alCambiar: (v: boolean) => void; alNormas?: () => void; fondo: 'verde' | 'crema'; error?: string }) {
  const verde = p.fondo === 'verde'
  const tono = verde ? 'sobreVerdeSecundario' : 'secundario'
  const enlace = verde ? 'crema' : 'verde'
  return (
    <View>
    <View style={estilos.fila}>
      <Pressable
        onPress={() => p.alCambiar(!p.marcada)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: p.marcada }}
        accessibilityLabel={T.antes + T.normas + T.medio + T.terminos + T.despues}
        hitSlop={10}
        style={[
          estilos.caja,
          { borderColor: p.marcada ? color.terracota : p.error ? (verde ? color.avisoSobreVerde : color.terracota) : verde ? cremaAlfa(0.5) : tinta(0.35) },
          p.marcada && { backgroundColor: color.terracota },
        ]}
      >
        {p.marcada ? (
          <Svg width={14} height={14} viewBox="0 0 14 14">
            <Path d="M2.5 7.5l3 3 6-7" stroke={color.crema} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        ) : null}
      </Pressable>
      <Texto variante="nota" tono={tono} style={{ flex: 1 }} onPress={() => p.alCambiar(!p.marcada)}>
        {T.antes}
        <Texto variante="nota" tono={enlace} style={estilos.enlace} onPress={p.alNormas ?? (() => router.push('/normas'))}>
          {T.normas}
        </Texto>
        {T.medio}
        <Texto variante="nota" tono={enlace} style={estilos.enlace} onPress={() => router.push('/legal?doc=terminos')}>
          {T.terminos}
        </Texto>
        {T.despues}
      </Texto>
    </View>
      {/* Donde está la casilla, que es donde hay que mirar (entrega «acceso»). */}
      {p.error && !p.marcada ? (
        <Texto variante="cuerpoChico" tono={verde ? 'avisoSobreVerde' : 'terracota'} accessibilityLiveRegion="polite" style={{ marginTop: 8, marginLeft: 34 }}>
          {p.error}
        </Texto>
      ) : null}
    </View>
  )
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 14 },
  caja: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  enlace: { textDecorationLine: 'underline' },
})
