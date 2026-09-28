import { useState } from 'react'
import { Pressable, StyleSheet, View, type TextInputProps } from 'react-native'

import { Campo } from './Campo'
import { Texto } from './Texto'
import { medida, terracotaAlfa } from './tokens'

/**
 * La contraseña, con «Ver» dentro del campo. Poder verla es mejor que
 * repetirla a ciegas (la web lo dejó escrito), así que hay las dos cosas.
 */
type Props = TextInputProps & {
  visible: boolean
  onAlternar?: () => void
  textos?: { ver: string; ocultar: string; verEtiqueta: string; ocultarEtiqueta: string }
  dispar?: boolean
  fondo?: 'crema' | 'verde'
}

export function CampoClave({ visible, onAlternar, textos, dispar, fondo = 'crema', ...resto }: Props) {
  return (
    <View style={{ justifyContent: 'center' }}>
      <Campo
        {...resto}
        fondo={fondo}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        style={[onAlternar ? { paddingRight: 84 } : null, dispar ? { backgroundColor: terracotaAlfa(0.06) } : null]}
      />
      {onAlternar && textos ? (
        <Pressable
          onPress={onAlternar}
          accessibilityRole="button"
          accessibilityLabel={visible ? textos.ocultarEtiqueta : textos.verEtiqueta}
          style={estilos.ver}
        >
          <Texto variante="cuerpoChico" tono={fondo === 'verde' ? 'sobreVerdeSecundario' : 'verde'}>
            {visible ? textos.ocultar : textos.ver}
          </Texto>
        </Pressable>
      ) : null}
    </View>
  )
}

const estilos = StyleSheet.create({
  ver: { position: 'absolute', right: 8, minHeight: medida.toqueMinimo, justifyContent: 'center', paddingHorizontal: 12 },
})
