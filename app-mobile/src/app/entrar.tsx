import AsyncStorage from '@react-native-async-storage/async-storage'
import { router, useLocalSearchParams } from 'expo-router'
import { useMemo, useRef } from 'react'

import { BIENVENIDA_VISTA } from '../entrada/bienvenida-vista'
import { Entrar, type TrasProveedor } from '../entrar/Entrar'
import * as MP from '../puerta/maquina'
import { crearServicioPuerta } from '../puerta/servicio'
import { api, supabase } from '../sesion'
import { destinoDePaso, terminarEntrada } from '../sesion/nativo'
import { disponible, entrarCon } from '../sesion/proveedores'
import * as T from '../texto/entrar'
import { cuenta as TP, guardando as TG } from '../texto/puerta'

const NOMBRE = { apple: 'Apple', google: 'Google' } as const

/**
 * /entrar. Con correo, la sesión la abre el SDK. Con Apple o Google, el SDK
 * del proveedor y después `/api/auth/nativo`, que dice en qué punto del
 * embudo está la persona: se va a ESA pantalla, no a una lista propia.
 */
export default function Pantalla() {
  // A dónde seguir cuando termine la fase de correo distinto o de relay.
  const destino = useRef<string>('/')
  // Llega del alta (`/puerta`) con un correo que ya tenía cuenta.
  const { correo: correoInicial, yaTiene } = useLocalSearchParams<{ correo?: string; yaTiene?: string }>()
  const puerta = useMemo(() => crearServicioPuerta(api), [])

  /**
   * Si quedó un borrador del alta (se registró con un correo que ya tenía
   * cuenta, o cerró la app a mitad), sus respuestas se mandan ahora que hay
   * sesión, y se sigue a donde diga el embudo. Si no, al destino de siempre.
   */
  const alDentro = async () => {
    const crudo = await AsyncStorage.getItem(MP.CLAVE_BORRADOR).catch(() => null)
    if (crudo) {
      try {
        const envios = MP.envios(JSON.parse(crudo) as MP.Borrador, new Date())
        const g = envios.length ? await puerta.guardar(envios, TG.fallo) : { ok: true as const }
        if (g.ok) {
          await AsyncStorage.removeItem(MP.CLAVE_BORRADOR).catch(() => {})
          const e = await puerta.estado()
          destino.current = MP.destinoDeEstado(e.ok ? e.datos.estado : null)
        }
      } catch {
        /* borrador ilegible: se sigue sin él */
      }
    }
    router.replace(destino.current as never)
  }

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
      alDentro={alDentro}
      // SOLO DESARROLLO (ver Entrar.tsx): en la app publicada `__DEV__` es false y esto no existe.
      alOlvidarBienvenida={
        __DEV__
          ? async () => {
              await AsyncStorage.removeItem(BIENVENIDA_VISTA).catch(() => {})
              router.replace('/')
            }
          : undefined
      }
      correoInicial={correoInicial}
      avisoInicial={yaTiene ? TP.yaExiste : undefined}
      alEmpezar={() => router.replace('/puerta')}
    />
  )
}
