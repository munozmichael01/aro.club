import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
import { useMemo } from 'react'

import { preguntasDeEntrada } from '../entrada/preguntas'
import { crearServicio } from '../entrada/servicio'
import { Puerta } from '../puerta/Puerta'
import { crearServicioPuerta } from '../puerta/servicio'
import { reglas } from '../reglas'
import { api, supabase } from '../sesion'
import { terminarEntrada } from '../sesion/nativo'
import { disponible, entrarCon } from '../sesion/proveedores'
import * as TE from '../texto/entrar'

const NOMBRE = { apple: 'Apple', google: 'Google' } as const

/** /puerta: el alta de la app (preguntas → nacimiento → cuenta). Ver `src/puerta/Puerta.tsx`. */
export default function Pantalla() {
  const servicio = useMemo(() => crearServicioPuerta(api), [])
  const entrada = useMemo(() => crearServicio(api), [])
  return (
    <Puerta
      servicio={servicio}
      preguntas={async () => {
        const r = await entrada.zonas()
        return r.ok ? preguntasDeEntrada(reglas.PUERTA, reglas.ORDEN_PUERTA, r.datos.zonas) : null
      }}
      haySesion={async () => !!(await supabase.auth.getSession()).data.session}
      hayProveedor={disponible}
      conProveedor={async (x) => {
        const r = await entrarCon(x)
        if (!r.ok) return r.motivo === 'cancelado' ? 'cancelado' : r.motivo === 'no-disponible' ? TE.inicio.noDisponible(NOMBRE[x]) : TE.inicio.falloProveedor(NOMBRE[x])
        const t = await terminarEntrada(api, AsyncStorage, TE.sinTerminar.titulo)
        return t.ok ? null : t.error
      }}
      entrarConClave={async (correo, clave) => !(await supabase.auth.signInWithPassword({ email: correo, password: clave })).error}
      alTerminar={(destino) => router.replace(destino as never)}
      alEntrar={() => router.push('/entrar')}
    />
  )
}
