import * as Clipboard from 'expo-clipboard'
import { useEffect, useState } from 'react'
import { Share, View } from 'react-native'

import { Boton, Texto, color, fuente, tinta } from '../diseno'
import { mensaje } from '../texto/dentro'
import * as T from '../texto/perfil'
import type { Invitar } from './maquina'

/**
 * «Invita a alguien» (REFERIDOS.md, 30-10), como en la web: el código, copiar,
 * compartir el enlace y el conteo. Nunca QUIÉNES entraron: es un número.
 * La sección entera no sale sin verificar (`invitar: null`).
 */
export function InvitaAlguien({ x }: { x: Invitar }) {
  const [copiado, setCopiado] = useState(false)
  useEffect(() => {
    if (!copiado) return
    const t = setTimeout(() => setCopiado(false), 2000)
    return () => clearTimeout(t)
  }, [copiado])

  return (
    <View style={{ borderRadius: 24, backgroundColor: color.cremaElevada, padding: 18 }}>
      <Texto variante="cuerpo">{T.invitar.cuerpo(x.pct, x.porCada)}</Texto>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 16 }}>
        <Texto selectable style={{ flexGrow: 1, minWidth: 0, fontFamily: fuente.textoSemi, fontSize: 24, lineHeight: 30, letterSpacing: 1.4, color: color.verdeProfundo }}>
          {x.codigo}
        </Texto>
        <Boton tipo="secundario" texto={T.invitar.copiar(copiado)} onPress={() => Clipboard.setStringAsync(x.codigo).then(() => setCopiado(true)).catch(() => undefined)} />
        <Boton texto={T.invitar.compartir} onPress={() => Share.share({ message: mensaje(x) }).catch(() => undefined)} />
      </View>
      <View style={{ height: 1, backgroundColor: tinta(0.12), marginVertical: 16 }} />
      <Texto variante="cuerpo" style={{ fontFamily: fuente.textoSemi, color: color.verdeProfundo }}>
        {T.invitar.avance(x.avance, x.porCada)}
      </Texto>
      <Texto variante="cuerpoChico" tono="secundario" style={{ marginTop: 5 }}>
        {T.invitar.cuenta(x.apuntados, x.asistieron)}
      </Texto>
    </View>
  )
}
