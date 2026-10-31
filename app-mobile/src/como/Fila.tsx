import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'
import { Image, Pressable, StyleSheet, View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'

import { Texto, color, fuente, radio, tinta } from '../diseno'
import * as T from '../texto/como'
import { ComoFunciona, FOTOS, Panel } from './ComoFunciona'
import * as M from './maquina'

/**
 * La fila que abre «Cómo funciona»: «¿Cómo funciona?» en la hoja de reservar
 * (C1) y «Cómo funciona» en Mi mesa hasta la revelación (C3b). En Mi mesa,
 * además, se abre sola una vez con las tres juntas (C3).
 */
export function FilaComoFunciona(p: { plan: M.Plan; enMiMesa?: boolean }) {
  if (!M.tieneComoFunciona(p.plan.formato)) return null
  return <Fila {...p} />
}

function Fila({ plan, enMiMesa }: { plan: M.Plan; enMiMesa?: boolean }) {
  const [abierta, setAbierta] = useState(false)
  const [todas, setTodas] = useState(false)
  const t = enMiMesa ? T.filaMesa : T.fila
  const vista = M.vista(plan)

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
      {enMiMesa ? (
        // C3b: tarjeta con las tres fotos superpuestas, el título en serif y el chevron.
        <Pressable onPress={() => (setTodas(false), setAbierta(true))} accessibilityRole="button" style={e.tarjeta}>
          <View style={{ flexDirection: 'row' }}>
            {vista.tarjetas.map((x) =>
              vista.conFotos ? (
                <Image key={x.clave} source={FOTOS[x.clave]} style={e.redonda} />
              ) : (
                <View key={x.clave} style={[e.redonda, { overflow: 'hidden' }]}>
                  <Panel tipo={vista.tipo} clave={x.clave} ancho={30} redondo />
                </View>
              ),
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0, marginLeft: 14 }}>
            <Texto style={{ fontFamily: fuente.titular, fontSize: 19, lineHeight: 27, color: color.verdeProfundo }}>{t.titulo}</Texto>
            <Texto style={{ fontSize: 13, lineHeight: 17.5, color: color.cuerpo }}>{t.bajada}</Texto>
          </View>
          <Chevron />
        </Pressable>
      ) : (
        // C1: una fila entre filetes, no una tarjeta, con el «?» en un círculo oscuro.
        <Pressable onPress={() => (setTodas(false), setAbierta(true))} accessibilityRole="button" style={e.fila}>
          <View style={e.circulo}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Circle cx={12} cy={12} r={9} stroke={color.crema} strokeWidth={2.2} />
              <Path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5v.4M12 17h.01" stroke={color.crema} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Texto style={{ fontFamily: fuente.textoSemi, fontSize: 15, lineHeight: 19, color: color.verdeProfundo }}>{t.titulo}</Texto>
            <Texto style={{ fontSize: 13, lineHeight: 17, color: color.cuerpo }}>{t.bajada}</Texto>
          </View>
          <Chevron />
        </Pressable>
      )}
      <ComoFunciona plan={plan} abierta={abierta} todas={todas} alCerrar={cerrar} />
    </>
  )
}

function Chevron() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5l7 7-7 7" stroke={color.verdeProfundo} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

const e = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: tinta(0.12) },
  circulo: { width: 36, height: 36, borderRadius: 18, backgroundColor: color.verdeProfundo, alignItems: 'center', justifyContent: 'center' },
  tarjeta: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: tinta(0.12), backgroundColor: '#FFF8EA' },
  redonda: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: '#FFF8EA', marginRight: -10 },
})
