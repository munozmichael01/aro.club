import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { color, useVelo, Velo } from '../diseno'
import { esperaParaLevantar } from '../diseno/velo-tiempo'
import { tiempo } from '../diseno/tokens'
import { guardarLead, leerLead } from '../sesion/lead'
import * as T from '../texto/entrada'
import { cuentaAtras } from '../texto/fechas'
import { CIUDAD_PRODUCTO } from '../texto/zona'
import { Cabecera, FaseCorreo, FaseEnviando, FaseFinal, FaseQuiz, FaseRepetido, FaseSinPreguntas, Portada } from './Fases'
import { cuerpoDeRespuestas, destinoDeRepetido, inicial, reducir } from './maquina'
import { reglas } from '../reglas'
import { preguntasDeEntrada, type Pregunta } from './preguntas'
import type { crearServicio } from './servicio'

type Servicio = ReturnType<typeof crearServicio>
type Proxima = { hay: boolean; empiezaEn?: string; cierraEn?: string; zonaHoraria?: string } | null

/** Espera lo que falte hasta el suelo del velo: nada de fogonazos (Velo.tsx). */
const conSuelo = async <T,>(p: Promise<T>): Promise<T> => {
  const empezo = Date.now()
  const r = await p
  const falta = esperaParaLevantar(empezo, Date.now(), tiempo.veloMinimo)
  if (falta) await new Promise((ok) => setTimeout(ok, falta))
  return r
}

export function Entrada(p: { servicio: Servicio; onEntrar: () => void; onCompletar: () => void }) {
  const insets = useSafeAreaInsets()
  const [e, despachar] = useReducer(reducir, inicial())
  // `undefined` mientras carga, `null` si no se pudo: son dos cosas distintas
  // y se pintan distinto. Sin esa diferencia, un fallo se quedaba para
  // siempre en «Guardando tu puesto».
  const [preguntas, setPreguntas] = useState<Pregunta[] | null | undefined>(undefined)
  const [proxima, setProxima] = useState<Proxima>(null)
  const [token, setToken] = useState<string | null>(null)
  const [yaTienePuesto, setYaTienePuesto] = useState(false)
  const [ahora, setAhora] = useState(Date.now())
  const { tapado, levantar } = useVelo()

  useEffect(() => {
    // Quien ya dejó su correo no vuelve a un formulario en blanco (como la web).
    Promise.all([
      leerLead().then((l) => {
        if (l) {
          despachar({ tipo: 'escribir', correo: l.correo })
          setToken(l.token)
          setYaTienePuesto(true)
        }
      }),
      p.servicio.proxima().then((r) => setProxima(r.ok ? r.datos : null)),
    ]).finally(levantar)
    const t = setInterval(() => setAhora(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [p.servicio, levantar])

  const cargarPreguntas = useCallback(() => {
    setPreguntas(undefined)
    p.servicio.zonas().then((r) => setPreguntas(r.ok ? preguntasDeEntrada(reglas.PUERTA, reglas.ORDEN_PUERTA, r.datos.zonas) : null))
  }, [p.servicio])
  useEffect(cargarPreguntas, [cargarPreguntas])

  const enviar = useCallback(async () => {
    despachar({ tipo: 'enviar' })
    const r = await conSuelo(p.servicio.dejarCorreo(e.correo))
    if (!r.ok) return despachar({ tipo: 'fallo', error: r.error })
    if (r.datos.token) {
      setToken(r.datos.token)
      await guardarLead({ correo: e.correo.trim(), token: r.datos.token })
      return despachar({ tipo: 'guardado', repetido: false })
    }
    // Un correo que ya existe. Si es el de este celular (su token está en el
    // llavero), sigue donde lo dejó; si no, «ya estás registrado».
    const guardado = await leerLead()
    const suyo = !!guardado && guardado.correo.trim().toLowerCase() === e.correo.trim().toLowerCase()
    const destino = destinoDeRepetido(r.datos, suyo)
    if (destino === 'quiz' && guardado) {
      setToken(guardado.token)
      return despachar({ tipo: 'guardado', repetido: false })
    }
    if (destino === 'datos') {
      despachar({ tipo: 'reiniciar' })
      return p.onCompletar()
    }
    despachar({ tipo: 'guardado', repetido: true })
  }, [e.correo, p.servicio])

  const siguiente = useCallback(async () => {
    if (!preguntas) return
    if (e.paso < preguntas.length - 1) return despachar({ tipo: 'siguiente', total: preguntas.length })
    // Al terminar se ESPERA la respuesta. La web lo manda y sigue sin mirar;
    // aquí, si no se guardó, no se dice «tienes puesto» (anotado para decidir).
    despachar({ tipo: 'terminar' })
    const r = await conSuelo(p.servicio.guardarRespuestas(cuerpoDeRespuestas(e, token)))
    despachar(r.ok ? { tipo: 'terminado' } : { tipo: 'falloAlTerminar', error: r.error })
  }, [e, preguntas, token, p.servicio])

  const hayFecha = !!proxima?.hay
  const chip = T.chip(CIUDAD_PRODUCTO.nombre, hayFecha && proxima?.cierraEn ? cuentaAtras(proxima.cierraEn, ahora) : null)

  const nombresZonas = useMemo(() => {
    const z = preguntas?.find((q) => q.clave === 'zonas')
    const sel = e.respuestas.zonas ?? []
    return z ? z.opciones.filter((o) => sel.includes(o.valor)).map((o) => o.label) : []
  }, [preguntas, e.respuestas.zonas])

  // Mientras no se sabe si hay lead guardado ni qué fecha hay, el aro: no un
  // formulario vacío que medio segundo después cambia de texto.
  if (tapado) return <Velo sobreVerde />

  const enQuiz = e.fase === 'quiz' || e.fase === 'guardando'
  let cuerpo
  if (e.fase === 'correo')
    cuerpo = (
      <FaseCorreo
        correo={e.correo}
        error={e.error}
        yaTienePuesto={yaTienePuesto}
        onCambio={(v) => despachar({ tipo: 'escribir', correo: v })}
        onEnviar={enviar}
      />
    )
  else if (e.fase === 'enviando') cuerpo = <FaseEnviando correo={e.correo} />
  else if (enQuiz && preguntas === undefined) cuerpo = <FaseEnviando correo={e.correo} />
  else if (enQuiz && preguntas === null) cuerpo = <FaseSinPreguntas onReintentar={cargarPreguntas} />
  else if (enQuiz && preguntas)
    cuerpo = (
      <FaseQuiz
        estado={e}
        pregunta={preguntas[e.paso]}
        total={preguntas.length}
        guardando={e.fase === 'guardando'}
        onMarcar={(valor) => despachar({ tipo: 'marcar', pregunta: preguntas[e.paso], valor })}
        onSiguiente={siguiente}
        onAtras={() => despachar({ tipo: 'atras' })}
      />
    )
  else if (e.fase === 'final')
    cuerpo = (
      <FaseFinal
        correo={e.correo}
        hayFecha={hayFecha}
        zonas={nombresZonas}
        onCompletar={p.onCompletar}
        onDespues={() => despachar({ tipo: 'reiniciar' })}
      />
    )
  else cuerpo = <FaseRepetido correo={e.correo} onEntrar={p.onEntrar} onOtro={() => despachar({ tipo: 'reiniciar' })} />

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.verdeProfundo }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[estilos.pagina, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}
      >
        <Cabecera onEntrar={e.fase === 'correo' ? p.onEntrar : undefined} />
        {e.fase === 'correo' ? <Portada chip={chip} /> : null}
        {cuerpo}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const estilos = StyleSheet.create({
  pagina: { paddingHorizontal: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
})
