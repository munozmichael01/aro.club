import { Pressable, StyleSheet } from 'react-native'

import { Texto } from './Texto'
import { cremaAlfa, medida, radio, tinta } from './tokens'

/**
 * Los enlaces pequeños del pie («Privacidad», «Términos»): una píldora con
 * borde, 44 de alto (el suelo de cualquier toque), como `enlacePie` en la web.
 */
export function EnlacePie({ texto, onPress, fondo = 'verde' }: { texto: string; onPress: () => void; fondo?: 'crema' | 'verde' }) {
  const verde = fondo === 'verde'
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      style={({ pressed }) => [estilos.base, { borderColor: verde ? cremaAlfa(0.2) : tinta(0.2), opacity: pressed ? 0.7 : 1 }]}
    >
      <Texto variante="cuerpoChico" tono={verde ? 'sobreVerdeSecundario' : 'cuerpo'}>
        {texto}
      </Texto>
    </Pressable>
  )
}

const estilos = StyleSheet.create({
  base: { minHeight: medida.toqueMinimo, justifyContent: 'center', paddingHorizontal: 15, borderRadius: radio.capsula, borderWidth: 1 },
})
