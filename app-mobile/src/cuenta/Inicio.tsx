import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUltimo } from '../util/useUltimo'
import { useFocusEffect } from 'expo-router'

import AsyncStorage from '@react-native-async-storage/async-storage'

import { usePreguntaAvisos } from '../avisos/PreguntaAvisos'
import * as MD from '../dentro/maquina'
import { Aviso, Boton, Texto, color, medida } from '../diseno'
import * as F from '../texto/fechas'
import * as T from '../texto/cuenta'
import * as M from './maquina'
import { Cabecera } from './Cabecera'
import { PreguntasNuevas } from './PreguntasNuevas'
import * as RM from '../reembolso/maquina'
import * as TR from '../texto/reembolso'
import { reglas } from '../reglas'
import { PreguntaIdioma } from '../idioma/PreguntaIdioma'
import * as TI from '../texto/idioma'
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
  // El permiso de grabación de la fecha abierta (18-10). Se olvida al cambiar de tarjeta.
  const [permiteGrabacion, setPermiteGrabacion] = useState(false)
  // La mesa en otro idioma (20-10): el 409 `falta-idioma` se convierte en una pregunta.
  const [pidiendoIdioma, setPidiendoIdioma] = useState<{ id: string; idioma: string } | null>(null)
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

  const { preguntar, abierta: avisosAbierta, hoja } = usePreguntaAvisos()
  // Las preguntas nuevas al reservar (18-10): cerradas o guardadas, no vuelven por esta reserva.
  const [preguntasCerradas, setPreguntasCerradas] = useState(false)
  const reservaId = datos?.reserva?.id
  useEffect(() => setPreguntasCerradas(false), [reservaId])

  // Cuarto momento: la primera vez que entra a su cuenta en la app, si nunca
  // se le preguntó (quien hizo todo en la web). Una vez cargado el Inicio, no
  // encima del esqueleto.
  const preguntada = useRef(false)
  useEffect(() => {
    if (!datos || preguntada.current) return
    preguntada.current = true
    preguntar('entrada')
  }, [datos, preguntar])

  // La primera vez que entra con la reserva ya confirmada, se abre «Estás
  // dentro» una vez (B3 de la entrega): la push o el correo pudieron no tocarse.
  const dentroMirado = useRef(false)
  useEffect(() => {
    if (!datos || dentroMirado.current) return
    const r = datos.reserva
    const plan = r?.empiezaEn ? datos.planes.find((x) => x.empiezaEn === r.empiezaEn && !x.cancelada) : null
    if (!r || r.revelado || !plan || plan.estado !== 'confirmed') return
    dentroMirado.current = true
    AsyncStorage.getItem(MD.claveVista(r.id))
      .then((v) => {
        if (v !== '1') p.ir('/estas-dentro')
      })
      .catch(() => undefined)
  }, [datos, p])

  const confirmar = async (id: string) => {
    if (!datos || !vista) return
    const graba = !!datos.agenda.find((a) => a.id === id)?.permisoObligatorio
    const r = M.botonReservar(datos, reservando, undefined, { graba, permiso: permiteGrabacion })
    if (r.accion === 'nada') return
    if (r.accion === 'completar' && r.destino) return p.ir(r.destino)
    if (r.accion === 'verificar') return p.ir('/verificacion')
    if (r.accion === 'pagar') return p.ir('/pago', { evento: id })
    setReservando(true)
    setFalloReserva('')
    const res = await servicio.reservar(id, graba ? true : undefined)
    setReservando(false)
    if (!res.ok) {
      // El candado del servidor: si falta algo del embudo, se lleva allí.
      if (res.motivo === 'perfil-incompleto' && res.donde) return p.ir(res.donde)
      if (res.motivo === TI.MOTIVO) return setPidiendoIdioma({ id, idioma: res.idioma ?? 'en' })
      return setFalloReserva(res.error)
    }
    setAbierta(null)
    // El estado de la cuenta cambia con la reserva: se relee todo.
    // Ya va a «Estás dentro»: que la primera apertura no la abra otra vez.
    dentroMirado.current = true
    cargarTodo()
    // Reservó con crédito: ya está dentro (entrega estas-dentro, B1). La
    // pregunta de los avisos de «reserva» la hace esa pantalla.
    p.ir('/estas-dentro', { via: 'credito' })
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
    cuerpo = (
      <>
        <Texto variante="display" style={{ marginBottom: 22 }}>
          {T.saludo(datos.nombre)}
        </Texto>
        <TarjetaEstado t={vista.tarjeta} revelaEn={datos.proximaFecha?.revelaEn} alAccion={() => irA(vista.tarjeta.destino)} />

        {/* El reembolso del crédito por lista de espera (21-10): el botón mientras haya plazo, y el acuse si ya lo pidió. */}
        {RM.fase(datos.reembolso) === 'pedir' ? (
          <View style={estilos.reembolso}>
            <Boton tipo="secundario" texto={TR.boton} onPress={() => p.ir('/reembolso')} />
            {datos.reembolso?.hasta ? (
              <Texto variante="nota" style={{ marginTop: 10 }}>
                {TR.hasta((() => { const x = reglas.partesDe(datos.reembolso!.hasta); return x ? `${x.dia} ${x.numero}` : '' })())}
              </Texto>
            ) : null}
          </View>
        ) : RM.fase(datos.reembolso) === 'pendiente' ? (
          <View style={estilos.reembolso}>
            <Texto variante="rotulo">{TR.acuse.titulo}</Texto>
            <Texto variante="cuerpoChico" style={{ marginTop: 3 }}>
              {TR.acuse.cuerpo(RM.bs(datos.reembolso?.montoBs), null)}
            </Texto>
          </View>
        ) : null}

        <Seccion onLayout={(y) => (yAgenda.current = y)}>
          <Agenda
            ciudadCerrada={datos?.ciudad && !datos.ciudad.abierta ? datos.ciudad.nombre : null}
            filtros={vista.filtros}
            grupos={vista.grupos}
            abierta={abierta}
            textoReservar={(precio, graba) => M.botonReservar(datos, reservando, precio, { graba, permiso: permiteGrabacion }).texto}
            pidePermiso={datos.creditos > 0}
            permiso={permiteGrabacion}
            alPermiso={() => setPermiteGrabacion((x) => !x)}
            fallo={falloReserva}
            alFiltro={(f) => {
              // «Todos» deja la lista entera; tocar otra vez la elegida no desmarca (entrega 19).
              setFiltro(f === M.TODOS ? null : f)
              setAbierta(null)
            }}
            alAbrir={(id) => {
              setAbierta((x) => (x === id ? null : id))
              setFalloReserva('')
              setPermiteGrabacion(false)
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
        <Pie alPulsar={(ruta) => p.ir(ruta.startsWith('app:') ? ruta.slice(4) : `web:${ruta}`)} />
      </ScrollView>
      {hoja}
      <PreguntaIdioma
        idioma={pidiendoIdioma?.idioma ?? null}
        alCerrar={() => setPidiendoIdioma(null)}
        alAnadir={() => {
          const id = pidiendoIdioma?.id
          setPidiendoIdioma(null)
          // Reintenta la reserva sola: ya dijo que sí.
          if (id) confirmar(id)
        }}
      />
      <PreguntasNuevas
        preguntas={datos?.preguntasNuevas ?? []}
        // Nunca a la vez que la pregunta de los avisos: dos hojas a la vez, en iOS, una no se abre.
        visible={!preguntasCerradas && !avisosAbierta}
        responder={servicio.responder}
        vistas={servicio.preguntasVistas}
        alTerminar={() => {
          setPreguntasCerradas(true)
          releer()
        }}
      />
    </View>
  )
}

const estilos = StyleSheet.create({
  pagina: { paddingHorizontal: medida.margenLateral, paddingTop: 24, maxWidth: 720, width: '100%', alignSelf: 'center' },
  reembolso: { marginTop: 18, borderRadius: 26, backgroundColor: color.cremaElevada, padding: 18 },
})
