import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUltimo } from '../util/useUltimo'
import { useFocusEffect } from 'expo-router'

import { pedirAvisos } from '../avisos/push'
import { Aviso, Boton, Texto, color, medida } from '../diseno'
import { reglas } from '../reglas'
import * as F from '../texto/fechas'
import * as T from '../texto/cuenta'
import * as M from './maquina'
import { Cabecera } from './Cabecera'
import { Agenda, Atajos, Esqueleto, LoProximo, Pie, Seccion, TarjetaEstado, Valorar } from './Partes'
import type { crearServicioCuenta } from './servicio'
import { contarFormato } from './voz'

type Servicio = ReturnType<typeof crearServicioCuenta>

/** Mientras una persona revisa la verificación, se relee cada tanto: quien espera mira esta pantalla, no la recarga. */
const RELEER_EN_REVISION_MS = 20000

/**
 * El Inicio (`/cuenta`), calcado de `Mi cuenta.dc.html`: saludo, la tarjeta
 * del punto en que estás, la agenda, lo pendiente de valorar, lo próximo,
 * los atajos y el pie.
 *
 * `ir` recibe rutas de la app («/mesa»), el ancla de la agenda («#agenda»)
 * o páginas de la web («web:/terminos»): quien lo monta decide cómo abrir
 * cada una.
 */
export function Inicio(p: {
  servicio: Servicio
  ir: (destino: string, params?: Record<string, string>) => void
  alEntrar: () => void
  alSalir: () => Promise<void>
}) {
  const insets = useSafeAreaInsets()
  const [datos, setDatos] = useState<M.MiCuenta | null>(null)
  const [mesa, setMesa] = useState<M.MiMesa | null>(null)
  const [nExcl, setNExcl] = useState<number | null>(null)
  const [fallo, setFallo] = useState('')
  const [refrescando, setRefrescando] = useState(false)
  const [filtro, setFiltro] = useState<string | null>(null)
  const [abierta, setAbierta] = useState<string | null>(null)
  const [reservando, setReservando] = useState(false)
  const [falloReserva, setFalloReserva] = useState('')
  const [saliendo, setSaliendo] = useState(false)

  const scroll = useRef<ScrollView>(null)
  const yAgenda = useRef(0)
  const actual = useRef<M.MiCuenta | null>(null)
  actual.current = datos

  const { servicio } = p
  const alEntrar = useUltimo(p.alEntrar)

  /** Relee la cuenta. Si el servidor dice que no, no se toca lo que había. */
  const releer = useCallback(async () => {
    const r = await servicio.cuenta()
    if (r.ok) {
      setDatos(r.datos)
      setFallo('')
    } else if (r.status === 401) alEntrar.current()
    else if (!actual.current) setFallo(r.error)
    return r.ok
  }, [servicio, alEntrar])

  const cargarTodo = useCallback(async () => {
    const [ok] = await Promise.all([
      releer(),
      servicio.mesa().then((r) => setMesa(r.ok && r.datos.mesaId ? r.datos : null)),
      servicio.exclusiones().then((r) => r.ok && setNExcl(r.datos.exclusiones.length)),
    ])
    return ok
  }, [releer, servicio])

  // Al entrar y cada vez que se vuelve a la pestaña: las pestañas se quedan
  // montadas, y lo hecho en Mi mesa o en Perfil cambia lo que dice el Inicio.
  useFocusEffect(
    useCallback(() => {
      cargarTodo()
    }, [cargarTodo]),
  )

  // La pestaña de abajo dice «Mi mesa» o «Mi grupo» según lo reservado.
  useEffect(() => contarFormato(datos?.reserva?.formato), [datos])

  // Dos disparos, los dos baratos: al volver a la app (lo que hace de verdad
  // quien está pendiente) y cada veinte segundos SOLO mientras la
  // verificación está en revisión. En cuanto se aprueba, se apaga solo.
  useEffect(() => {
    const s = AppState.addEventListener('change', (e) => e === 'active' && releer())
    const t = setInterval(() => {
      if (actual.current?.verif === 'revision' && AppState.currentState === 'active') releer()
    }, RELEER_EN_REVISION_MS)
    return () => {
      s.remove()
      clearInterval(t)
    }
  }, [releer])

  const vista = useMemo(() => {
    if (!datos) return null
    const ahora = Date.now()
    return {
      tarjeta: M.tarjeta(datos, mesa, ahora),
      filtros: M.filtros(datos.agenda, filtro),
      grupos: M.agenda(datos.agenda, filtro, ahora),
      proximos: M.proximos(datos.planes),
      atajos: M.atajos(datos, nExcl),
      reservar: M.botonReservar(datos, reservando),
    }
  }, [datos, mesa, nExcl, filtro, reservando])

  const irA = (destino: string) => {
    if (destino === '#agenda') return scroll.current?.scrollTo({ y: yAgenda.current - 12, animated: true })
    p.ir(destino)
  }

  const confirmar = async (id: string) => {
    if (!datos || !vista) return
    const r = vista.reservar
    if (r.accion === 'nada') return
    if (r.accion === 'completar' && r.destino) return p.ir(r.destino)
    if (r.accion === 'verificar') return p.ir('/verificacion')
    if (r.accion === 'pagar') return p.ir('/pago', { evento: id })
    setReservando(true)
    setFalloReserva('')
    const res = await servicio.reservar(id)
    setReservando(false)
    if (!res.ok) {
      // El candado del servidor: si falta algo del embudo, se lleva allí.
      if (res.motivo === 'perfil-incompleto' && res.donde) return p.ir(res.donde)
      return setFalloReserva(res.error)
    }
    setAbierta(null)
    // Apartó puesto: ahora tiene algo que esperar, y es el momento de pedir
    // el permiso de las push (nunca al abrir la app).
    pedirAvisos()
    // El estado de la cuenta cambia con la reserva: se relee todo.
    cargarTodo()
  }

  const salir = async () => {
    if (saliendo) return
    setSaliendo(true)
    await p.alSalir()
  }

  let cuerpo
  if (!datos) {
    cuerpo = fallo ? (
      <View style={{ gap: 16 }}>
        <Aviso tono="ojo">{fallo}</Aviso>
        <Boton tipo="secundario" texto={T.sinRespuesta.reintentar} onPress={() => (setFallo(''), cargarTodo())} />
      </View>
    ) : (
      <Esqueleto />
    )
  } else if (vista) {
    const cuando = F.cuandoSeSabe(datos.proximaFecha?.revelaEn, datos.proximaFecha?.zonaHoraria)
    cuerpo = (
      <>
        <Texto variante="display" style={{ marginBottom: 22 }}>
          {T.saludo(datos.nombre)}
        </Texto>
        <TarjetaEstado t={vista.tarjeta} revelaEn={datos.proximaFecha?.revelaEn} alAccion={() => irA(vista.tarjeta.destino)} />

        <Seccion onLayout={(y) => (yAgenda.current = y)}>
          <Agenda
            filtros={vista.filtros}
            grupos={vista.grupos}
            cuandoSeSabe={cuando}
            abierta={abierta}
            textoReservar={vista.reservar.texto}
            precio={T.agenda.precio(reglas.precioTexto())}
            fallo={falloReserva}
            alFiltro={(f) => {
              setFiltro((x) => (x === f ? null : f))
              setAbierta(null)
            }}
            alQuitarFiltro={() => {
              setFiltro(null)
              setAbierta(null)
            }}
            alAbrir={(id) => {
              setAbierta((x) => (x === id ? null : id))
              setFalloReserva('')
            }}
            alConfirmar={confirmar}
          />
        </Seccion>

        {datos.porValorar ? (
          <Seccion arriba={32}>
            <Valorar sitio={datos.porValorar.sitio} alPulsar={() => p.ir('/mesa')} />
          </Seccion>
        ) : null}

        <Seccion>
          <LoProximo mios={vista.proximos} alCancelar={() => p.ir('/cancelar')} alVerAgenda={() => irA('#agenda')} />
        </Seccion>

        <Seccion>
          <Atajos atajos={vista.atajos} alPulsar={irA} />
        </Seccion>
      </>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.crema }}>
      <Cabecera
        arriba={insets.top}
        esOps={!!datos?.esOps}
        saliendo={saliendo}
        alOperacion={() => p.ir('web:/operacion')}
        alSalir={salir}
      />
      <ScrollView
        ref={scroll}
        contentContainerStyle={[estilos.pagina, { paddingBottom: 40 }]}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            tintColor={color.verde}
            onRefresh={async () => {
              setRefrescando(true)
              await cargarTodo()
              setRefrescando(false)
            }}
          />
        }
      >
        {cuerpo}
        <Pie alPulsar={(ruta) => p.ir(`web:${ruta}`)} />
      </ScrollView>
    </View>
  )
}

const estilos = StyleSheet.create({
  pagina: { paddingHorizontal: medida.margenLateral, paddingTop: 24, maxWidth: 720, width: '100%', alignSelf: 'center' },
})
