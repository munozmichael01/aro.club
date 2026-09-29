import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
import { useRef } from 'react'

import { Entrar, type TrasProveedor } from '../entrar/Entrar'
import { api, supabase } from '../sesion'
import { destinoDePaso, terminarEntrada } from '../sesion/nativo'
import { disponible, entrarCon } from '../sesion/proveedores'
import * as T from '../texto/entrar'

const NOMBRE = { apple: 'Apple', google: 'Google' } as const

/**
 * /entrar. Con correo, la sesión la abre el SDK. Con Apple o Google, el SDK
 * del proveedor y después `/api/auth/nativo`, que dice en qué punto del
 * embudo está la persona: se va a ESA pantalla, no a una lista propia.
 */
export default function Pantalla() {
  // A dónde seguir cuando termine la fase de correo distinto o de relay.
  const destino = useRef<string>('/')

  const conProveedor = async (p: 'apple' | 'google'): Promise<TrasProveedor> => {
    const r = await entrarCon(p)
    if (!r.ok) {
      if (r.motivo === 'cancelado') return { tipo: 'cancelado' }
      return { tipo: 'aviso', texto: r.motivo === 'no-disponible' ? T.inicio.noDisponible(NOMBRE[p]) : T.inicio.falloProveedor(NOMBRE[p]) }
    }
    const t = await terminarEntrada(api, AsyncStorage, T.sinTerminar.titulo)
    if (!t.ok) {
      // Sin sesión válida no hay nada que terminar: fuera, limpio.
      if (t.status === 401) await supabase.auth.signOut().catch(() => {})
      // Con red caída la marca se queda y se reintenta al abrir la app.
      return { tipo: 'aviso', texto: t.error }
    }
    destino.current = destinoDePaso(t.datos.paso) ?? '/'
    if (t.datos.relay) return { tipo: 'relay' }
    if (t.datos.otroCorreo) {
      // El del registro es el de contacto que ya tiene el perfil.
      const perfil = await api.json<{ contacto?: string; correo?: string }>('/mi-perfil').catch(() => null)
      const registro = perfil?.datos?.contacto || ''
      if (registro && registro !== t.datos.otroCorreo) return { tipo: 'otroCorreo', registro, entrada: t.datos.otroCorreo }
    }
    return { tipo: 'dentro' }
  }

  return (
    <Entrar
      entrar={async (correo, clave) => {
        try {
          const { error } = await supabase.auth.signInWithPassword({ email: correo, password: clave })
          if (!error) return 'ok'
          // Credenciales que no cuadran (400) frente a no llegar al servidor.
          return error.status && error.status < 500 ? 'no-coinciden' : 'sin-red'
        } catch {
          return 'sin-red'
        }
      }}
      recuperar={async (correo) => {
        try {
          const r = await api.pedir('/entrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accion: 'recuperar', correo }),
          })
          return r.ok
        } catch {
          return false
        }
      }}
      conProveedor={conProveedor}
      hayProveedor={disponible}
      guardarContacto={async (correo) => {
        try {
          const r = await api.enviar('/mi-perfil', { clave: 'contacto', valor: correo })
          return r.status < 300
        } catch {
          return false
        }
      }}
      alDentro={() => router.replace(destino.current as never)}
      alEmpezar={() => router.replace('/puerta')}
    />
  )
}
