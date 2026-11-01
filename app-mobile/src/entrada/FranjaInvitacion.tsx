import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { Texto, fuente } from '../diseno'
import { api } from '../sesion'
import { codigoGuardado } from '../sesion/traido'

export type Invitacion = { codigo: string; nombre: string | null; pct: number | null }

/**
 * Quien llegó con el enlace de alguien (`/i/<código>`): de quién y qué trae.
 * Lo comprueba `GET /api/referido`, la misma comprobación que la web (194ebd1):
 * un código que ya no vale no pinta nada.
 */
export function useInvitacion(fija?: Invitacion | null) {
  const [inv, setInv] = useState<Invitacion | null>(fija ?? null)
  useEffect(() => {
    if (fija !== undefined) return
    let vivo = true
    ;(async () => {
      const codigo = await codigoGuardado()
      if (!codigo) return
      const r = await api.pedir(`/referido?codigo=${encodeURIComponent(codigo)}`).catch(() => null)
      if (!r?.ok) return
      const j = (await r.json().catch(() => null)) as Invitacion | null
      if (vivo && j?.codigo) setInv(j)
    })()
    return () => {
      vivo = false
    }
  }, [fija])
  return inv
}

/**
 * La franja de la portada de la web (Landing v4, copy aprobado por Michael el
 * 29-10): «Te invitó Andrea · tu primera fecha con un 20% de descuento». Sin
 * nombre, «Tienes una invitación»; sin tanto por ciento, «con descuento».
 */
export function textoInvitacion(inv: Invitacion) {
  const quien = inv.nombre ? `Te invitó ${inv.nombre}` : 'Tienes una invitación'
  const trae = inv.pct ? `tu primera fecha con un ${inv.pct}% de descuento` : 'tu primera fecha con descuento'
  return `${quien} · ${trae}`
}

export function FranjaInvitacion({ inv }: { inv: Invitacion | null }) {
  if (!inv) return null
  return (
    <View style={{ backgroundColor: '#1B5138', paddingVertical: 11, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#E39C63' }} />
      <Texto style={{ flexShrink: 1, fontFamily: fuente.textoMedia, fontSize: 14, lineHeight: 20, color: '#FAF3E4', textAlign: 'center' }}>{textoInvitacion(inv)}</Texto>
    </View>
  )
}
