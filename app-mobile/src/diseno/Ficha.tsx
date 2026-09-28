import { Pressable, StyleSheet, Text } from 'react-native'

import { color, fuente, radio, tinta } from './tokens'

/**
 * Una ficha de escala, sin aro: «Excelente», «Bien», «Regular», «Mala». La
 * marcada se rellena de crema elevada con borde verde, o terracota si es la
 * mala (la web la llama `chipPlano`).
 */
export function Ficha({ texto, marcada, mala, onPress }: { texto: string; marcada: boolean; mala?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      aria-checked={marcada}
      style={[
        estilos.base,
        { backgroundColor: marcada ? color.cremaElevada : 'transparent', borderColor: marcada ? (mala ? color.terracota : color.verde) : tinta(0.2) },
      ]}
    >
      <Text style={[estilos.texto, { fontFamily: marcada ? fuente.textoSemi : fuente.texto }]}>{texto}</Text>
    </Pressable>
  )
}

const estilos = StyleSheet.create({
  base: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: radio.capsula, borderWidth: 1 },
  texto: { fontSize: 14, lineHeight: 18, color: color.verdeProfundo },
})
