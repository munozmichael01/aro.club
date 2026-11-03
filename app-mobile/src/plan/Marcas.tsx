import { View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import { Texto, color, fuente } from '../diseno'
import { reglas, type CapsulaMarca as Capsula, type FechaPlan } from '../reglas'

/**
 * Las piezas de «Qué estás reservando» (entrega del 02-11), las mismas en la
 * agenda, la hoja de reservar y «Cómo funciona». Todo el texto y los colores
 * salen de `reglas.js` (2f07b97): aquí solo se pintan.
 */

/** El icono de un plan (cena, drinks, coffee, brunch, grupo), en el trazo de los demás. */
export function IconoPlan({ formato, tam = 15, color: c = color.terracota, grosor = 2 }: { formato?: string | null; tam?: number; color?: string; grosor?: number }) {
  return <IconoTrazo d={reglas.ICONOS_PLAN[reglas.COMO_FUNCIONA.planDe(formato)]} tam={tam} color={c} grosor={grosor} />
}

export function IconoTrazo({ d, tam, color: c, grosor = 2 }: { d: string; tam: number; color: string; grosor?: number }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none">
      <Path d={d} stroke={c} strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

/** El cuadro crema tostado con el icono del plan, junto al nombre del formato. */
export function CuadroPlan({ formato, lado = 24 }: { formato?: string | null; lado?: number }) {
  return (
    <View style={{ width: lado, height: lado, borderRadius: lado * 0.29, backgroundColor: '#F3E3C7', alignItems: 'center', justifyContent: 'center' }}>
      <IconoPlan formato={formato} tam={Math.round(lado * 0.62)} color={color.terracota} />
    </View>
  )
}

/** Una cápsula de marca. `sobreVerde` para el bloque «Esta fecha»; `chica` para dentro de las líneas. */
export function CapsulaMarca({ c, sobreVerde, chica, corta }: { c: Capsula; sobreVerde?: boolean; chica?: boolean; corta?: boolean }) {
  const k = sobreVerde ? c.sobreVerde : c
  const alto = chica ? 20 : 24
  return (
    <View
      accessibilityLabel={c.texto}
      style={{
        height: alto,
        paddingHorizontal: chica ? 8 : 10,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: k.borde,
        backgroundColor: k.fondo,
        justifyContent: 'center',
        // En las líneas de «Esta fecha» va a la izquierda; junto al formato, centrada en la fila.
        alignSelf: chica ? 'flex-start' : 'center',
      }}
    >
      <Texto style={{ fontFamily: fuente.textoNegrita, fontSize: chica ? 11 : 11.5, lineHeight: 14, letterSpacing: 0.8, color: k.color }} numberOfLines={1}>
        {corta ? c.corto : c.texto}
      </Texto>
    </View>
  )
}

/** Las cápsulas de una fecha, en orden. */
export function Capsulas({ fecha, capsulas }: { fecha?: FechaPlan; capsulas?: Capsula[] }) {
  const lista = capsulas ?? (fecha ? reglas.capsulasDe(fecha) : [])
  if (!lista.length) return null
  return (
    <>
      {lista.map((c) => (
        <CapsulaMarca key={c.clave} c={c} />
      ))}
    </>
  )
}

/**
 * «Esta fecha» (A): la frase del plan y, si hay marcas, una línea por marca.
 * Solo lectura: no se toca ni se pliega.
 */
export function EstaFecha({ fecha }: { fecha: FechaPlan }) {
  const lineas = reglas.lineasDeHoja(fecha)
  return (
    <View style={{ borderRadius: 20, backgroundColor: color.verdeProfundo, padding: 16, gap: 12 }} accessible accessibilityRole="summary">
      <Texto style={{ fontFamily: fuente.textoNegrita, fontSize: 10.5, lineHeight: 14, letterSpacing: 1.7, color: color.terracotaSobreVerde }}>ESTA FECHA</Texto>
      <Texto style={{ fontFamily: fuente.titular, fontSize: 19, lineHeight: 27, color: color.crema }}>{reglas.fraseDelPlan(fecha)}</Texto>
      {lineas.map((l) => (
        <View key={l.clave} style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(250,243,228,.14)', gap: 7, alignItems: 'flex-start' }}>
          <CapsulaMarca c={l.capsula} sobreVerde chica />
          <Texto style={{ fontSize: 14, lineHeight: 20, color: '#D6E3D9' }}>{l.texto}</Texto>
        </View>
      ))}
    </View>
  )
}
