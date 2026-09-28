import { router } from 'expo-router'

import { Entrar } from '../entrar/Entrar'
import { api, supabase } from '../sesion'

/** /entrar: la sesión la abre el SDK; recuperar va por /api/entrar. */
export default function Pantalla() {
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
      alDentro={() => router.replace('/')}
      alEmpezar={() => router.replace('/empezar')}
    />
  )
}
