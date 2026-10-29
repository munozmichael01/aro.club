import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { IconoFlecha, Marca, Texto, color, fuente, radio, tinta } from '../diseno'
import * as T from '../texto/como'
import { ComoFunciona } from './ComoFunciona'
import * as M from './maquina'

/**
 * La fila que abre «Cómo funciona»: «¿Cómo funciona?» en la hoja de reservar
 * (C1) y «Cómo funciona» en Mi mesa hasta la revelación (C3b). En Mi mesa,
 * además, se abre sola una vez con las tres juntas (C3).
 */
export function FilaComoFunciona({ plan, enMiMesa }: { plan: M.Plan; enMiMesa?: boolean }) {
  const [abierta, setAbierta] = useState(false)
  const [todas, setTodas] = useState(false)
  const t = enMiMesa ? T.filaMesa : T.fila

  useEffect(() => {
    if (!enMiMesa) return
    let vivo = true
    AsyncStorage.getItem(M.CLAVE_VISTA)
      .then((v) => {
        if (vivo && v !== '1') {
          setTodas(true)
          setAbierta(true)
        }
      })
      .catch(() => undefined)
    return () => {
      vivo = false
    }
  }, [enMiMesa])

  const cerrar = () => {
    setAbierta(false)
    if (todas) AsyncStorage.setItem(M.CLAVE_VISTA, '1').catch(() => undefined)
    setTodas(false)
  }

  return (
    <>
      <Pressable onPress={() => (setTodas(false), setAbierta(true))} accessibilityRole="button" style={e.fila}>
        {/* El isotipo y no un «?»: nada de glifos sueltos, iconos del sistema. */}
        <Marca tam={26} />
        <View style={{ flex: 1 }}>
          <Texto style={{ fontFamily: fuente.textoSemi, fontSize: 14, lineHeight: 18 }}>{t.titulo}</Texto>
          <Texto variante="nota">{t.bajada}</Texto>
        </View>
        <IconoFlecha tam={13} color={color.cuerpo} />
      </Pressable>
      <ComoFunciona plan={plan} abierta={abierta} todas={todas} alCerrar={cerrar} />
    </>
  )
}

const e = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radio.tarjeta, borderWidth: 1, borderColor: tinta(0.12), backgroundColor: color.cremaElevada },
})
