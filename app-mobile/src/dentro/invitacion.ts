import { useEffect, useState } from 'react'

import { api, supabase } from '../sesion'

/**
 * El código de referido de quien comparte, para las historias y el mensaje.
 * Sale de `invitar` en `/api/mi-perfil` (30-10), que además lo crea si aún no
 * existe. Sin verificar viene `null`, y se comparte sin código, como antes.
 * Se lee una vez por cuenta: el código no cambia, pero en el mismo teléfono
 * puede entrar otra persona, y compartiría el código de la anterior.
 */
export type Invitacion = { codigo: string; enlace: string; pct: number }

const guardadas = new Map<string, Promise<Invitacion | null>>()

async function leer(): Promise<Invitacion | null> {
  const quien = (await supabase.auth.getSession()).data.session?.user.id
  if (!quien) return null
  let p = guardadas.get(quien)
  if (!p) {
    p = api
      .pedir('/mi-perfil')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j?.invitar?.codigo && j.invitar.enlace ? { codigo: j.invitar.codigo, enlace: j.invitar.enlace, pct: j.invitar.pct ?? 20 } : null))
      .catch(() => null)
      .then((x) => {
        // Si no vino (sin red, sin verificar), que se vuelva a intentar la próxima vez.
        if (!x) guardadas.delete(quien)
        return x
      })
    guardadas.set(quien, p)
  }
  return p
}

export function useInvitacion(): Invitacion | null {
  const [inv, setInv] = useState<Invitacion | null>(null)
  useEffect(() => {
    let vivo = true
    leer().then((x) => vivo && setInv(x))
    return () => {
      vivo = false
    }
  }, [])
  return inv
}
