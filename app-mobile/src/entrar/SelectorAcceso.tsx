import { Pressable, StyleSheet, View } from 'react-native'

import { Texto, fuente } from '../diseno'
import { acceso as T } from '../texto/entrar'

/**
 * «Entrar · Crear cuenta», arriba de Entrar, Entrar con correo y Crear cuenta
 * (entrega «acceso» de Design, 20-10). Siempre se ve en cuál estás y se pasa
 * a la otra con un toque. La activa, en crema.
 */
export function SelectorAcceso({ activo, alEntrar, alCrear }: { activo: 'entrar' | 'crear'; alEntrar: () => void; alCrear: () => void }) {
  return (
    <View accessibilityRole="tablist" style={e.fila}>
      {(['entrar', 'crear'] as const).map((k) => {
        const on = activo === k
        return (
          <Pressable
            key={k}
            accessibilityRole="tab"
            aria-selected={on}
            onPress={on ? undefined : k === 'entrar' ? alEntrar : alCrear}
            style={[e.pestana, on ? e.activa : null]}
          >
            <Texto style={{ fontFamily: fuente.textoSemi, fontSize: 16, lineHeight: 20, color: on ? '#14342A' : '#C5D8CA' }}>{T[k]}</Texto>
          </Pressable>
        )
      })}
    </View>
  )
}

const e = StyleSheet.create({
  fila: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 999, backgroundColor: 'rgba(156,187,166,.14)', borderWidth: 1, borderColor: 'rgba(156,187,166,.32)', marginBottom: 30 },
  pestana: { flex: 1, minHeight: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  activa: { backgroundColor: '#FAF3E4' },
})
