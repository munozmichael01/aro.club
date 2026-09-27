import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native'

import { color, cremaAlfa, fuente, radio, tinta } from './tokens'

/**
 * El campo de texto en cápsula. Sobre verde es el del registro («tu@correo.com»);
 * sobre crema, el de los formularios.
 *
 * `minHeight` y no `height`: con la letra del sistema al máximo, el campo
 * crece en vez de cortar lo que se escribe (criterio 9.6).
 */
type Props = TextInputProps & { fondo?: 'crema' | 'verde' }

export function Campo({ fondo = 'crema', style, ...resto }: Props) {
  const verde = fondo === 'verde'
  return (
    <View
      style={[
        estilos.caja,
        verde
          ? { borderColor: cremaAlfa(0.32), backgroundColor: cremaAlfa(0.06) }
          : { borderColor: tinta(0.18), backgroundColor: color.cremaElevada },
      ]}
    >
      <TextInput
        placeholderTextColor={verde ? cremaAlfa(0.5) : color.secundario}
        {...resto}
        style={[estilos.texto, { color: verde ? color.crema : color.verdeProfundo }, style]}
      />
    </View>
  )
}

const estilos = StyleSheet.create({
  caja: { borderWidth: 1, borderRadius: radio.capsula, overflow: 'hidden' },
  texto: { minHeight: 58, paddingHorizontal: 22, paddingVertical: 14, fontFamily: fuente.texto, fontSize: 17 },
})
