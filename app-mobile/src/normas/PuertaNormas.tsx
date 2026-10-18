import { useEffect, useState, type ReactNode } from 'react'

import { View } from 'react-native'

import { color } from '../diseno'
import { api } from '../sesion'
import { SinSesion } from '../sesion/api'
import * as T from '../texto/normas'
import { Normas } from './Normas'

/**
 * Las normas se aceptan UNA VEZ POR CUENTA (Michael, 18-10), no en cada
 * entrada. Al entrar a la cuenta se mira `normasAceptadas` de
 * `/api/mi-cuenta`: si es `false` (nunca aceptó, o aceptó una versión
 * anterior), se piden antes de enseñar nada más. Sin el campo (servidor
 * viejo) o sin red no se cierra el paso: el servidor es quien lo sabe.
 * Quien se dio de alta con correo ya lo aceptó en el alta.
 */
export function PuertaNormas({ children }: { children: ReactNode }) {
  // `null` mientras se pregunta: así no se ve la cuenta un instante antes de la puerta.
  const [falta, setFalta] = useState<boolean | null>(null)
  const [aceptando, setAceptando] = useState(false)
  const [fallo, setFallo] = useState('')

  useEffect(() => {
    let vivo = true
    const poner = (v: boolean) => vivo && setFalta((x) => (x === null ? v : x))
    // Sin respuesta en cuatro segundos se pasa: una puerta que no abre por la red no es una regla.
    const t = setTimeout(() => poner(false), 4000)
    api
      .pedir('/mi-cuenta')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => poner(j?.normasAceptadas === false))
      .catch(() => poner(false))
    return () => {
      vivo = false
      clearTimeout(t)
    }
  }, [])

  if (falta === null) return <View style={{ flex: 1, backgroundColor: color.crema }} />
  if (!falta) return <>{children}</>

  const aceptar = async () => {
    if (aceptando) return
    setAceptando(true)
    setFallo('')
    try {
      const r = await api.pedir('/normas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acepto: true }) })
      if (!r.ok) throw new Error(String(r.status))
      setFalta(false)
    } catch (e) {
      setFallo(e instanceof SinSesion ? e.message : T.puerta.noGuardado)
    } finally {
      setAceptando(false)
    }
  }
  return <Normas aceptar={{ alAceptar: aceptar, aceptando, fallo }} />
}
