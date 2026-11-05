import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUltimo } from '../util/useUltimo'
import { useFocusEffect } from 'expo-router'

import AsyncStorage from '@react-native-async-storage/async-storage'

import { usePreguntaAvisos } from '../avisos/PreguntaAvisos'
import * as MD from '../dentro/maquina'
import { Aviso, Boton, Entra, FranjaSinRed, SinRespuesta, Tarda, Texto, color, medida, useTarda, useUmbral } from '../diseno'
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
import { Agenda, Atajos, EsqueletoInicio, LoProximo, Pie, Seccion, TarjetaEstado, Valorar } from './Partes'
import type { crearServicioCuenta } from './servicio'
import { contarFormato } from './voz'
import { recordar, recuerdo, recuerdoConHora } from '../util/recuerdo'

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
  /** No llegó la cuenta: por la red, o porque el servidor contestó con error («es cosa nuestra»). */
  const [caida, setCaida] = useState<{ servidor: boolean } | null>(null)
  const [reintentando, setReintentando] = useState(false)
  /** De cuándo son los datos a la vista: la franja dice esa hora, no la de ahora. */
  const [desde, setDesde] = useState<number | null>(null)
  /** Lo que se pinta viene de lo último guardado: entra sin fundido (entrega carga). */
  const deRecuerdo = useRef(false)
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
  /** La fecha cuya hoja se cerró para ir a pagar: al volver, se abre otra vez. */
  const volverAHoja = useRef<string | null>(null)
  actual.current = datos

  const { servicio } = p
  const alEntrar = useUltimo(p.alEntrar)

  /** Relee la cuenta. Si el servidor dice que no, no se toca lo que había. */
  const releer = useCallback(async () => {
    const r = await servicio.cuenta()
    if (r.ok) {
      // Sin «Estás dentro»: el salto lo decide la respuesta de AHORA, nunca un recuerdo (null, no undefined: undefined es «servidor viejo»).
      recordar('mi-cuenta', { ...r.datos, estasDentro: null })
      setDatos(r.datos)
      setDesde(Date.now())
      setCaida(null)
    } else if (r.status === 401) alEntrar.current()
    else setCaida({ servidor: r.status !== undefined })
    return r.ok
  }, [servicio, alEntrar])

  const cargarTodo = useCallback(async () => {
    const [ok] = await Promise.all([
      releer(),
      servicio.mesa().then((r) => (r.ok && recordar('mi-mesa', r.datos), setMesa(r.ok && r.datos.mesaId ? r.datos : null))),
      servicio.exclusiones().then((r) => r.ok && setNExcl(r.datos.exclusiones.length)),
    ])
    return ok
  }, [releer, servicio])

  // Al entrar y cada vez que se vuelve a la pestaña: las pestañas se quedan
  // montadas, y lo hecho en Mi mesa o en Perfil cambia lo que dice el Inicio.
  useFocusEffect(
    useCallback(() => {
      // Volvió del pago sin pagar: la hoja de esa fecha, en el acto y como la dejó, no el Inicio pelado (Michael, 03-11).
      const id = volverAHoja.current
      volverAHoja.current = null
      if (id && actual.current?.agenda.some((a) => a.id === id && !a.mia)) setAbierta(id)
      // Y se relee por detrás, sin esqueleto: lo que había se queda en pantalla hasta que llega lo nuevo.
      cargarTodo()
    }, [cargarTodo]),
  )

  // Lo último que se vio, al instante, mientras llega lo nuevo (03-11): el esqueleto, solo la primera vez.
  useEffect(() => {
    recuerdoConHora<M.MiCuenta>('mi-cuenta').then((x) => {
      if (!x || actual.current) return
      deRecuerdo.current = true
      setDatos(x.datos)
      setDesde(x.t)
    })
    recuerdo<NonNullable<typeof mesa>>('mi-mesa').then((x) => x && x.mesaId && setMesa((m) => m ?? x))
  }, [])

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
  //
  // Lo decide el servidor (`estasDentro`, 31-10), y se decide ANTES de pintar
  // el Inicio: pintarlo y saltar después era el «redirect raro» que vio Michael.
  const dentroMirado = useRef(false)
  const saltaADentro = !!datos?.estasDentro && !dentroMirado.current
  useEffect(() => {
    if (!datos || dentroMirado.current) return
    if (datos.estasDentro !== undefined) {
      if (!datos.estasDentro) return
      dentroMirado.current = true
      p.ir('/estas-dentro', { evento: datos.estasDentro })
      return
    }
    // Servidor viejo, sin el campo: la marca local de antes.
    const r = datos.reserva
    const plan = r?.empiezaEn ? datos.planes.find((x) => x.empiezaEn === r.empiezaEn && !x.cancelada) : null
    if (!r?.empiezaEn || r.revelado || !plan || plan.estado !== 'confirmed') return
    dentroMirado.current = true
    AsyncStorage.getItem(MD.claveVista(r.empiezaEn))
      .then((v) => {
        if (v !== '1') p.ir('/estas-dentro')
      })
      .catch(() => undefined)
  }, [datos, p])

  const confirmar = async (id: string, aceptaCondiciones?: boolean) => {
    if (!datos || !vista) return
    const fecha = datos.agenda.find((a) => a.id === id)
    const graba = !!fecha?.permisoObligatorio
    const r = M.botonReservar(datos, reservando, undefined, { graba, permiso: permiteGrabacion }, fecha?.creditos ?? 1)
    if (r.accion === 'nada') return
    // La hoja es un modal: se cierra antes de irse, o se quedaría encima de la pantalla nueva.
    if (r.accion !== 'reservar') setAbierta(null)
    if (r.accion === 'pagar') volverAHoja.current = id
    if (r.accion === 'completar' && r.destino) return p.ir(r.destino)
    if (r.accion === 'verificar') return p.ir('/verificacion')
    if (r.accion === 'pagar') return p.ir('/pago', { evento: id })
    setReservando(true)
    setFalloReserva('')
    const res = await servicio.reservar(id, graba ? true : undefined, aceptaCondiciones)
    setReservando(false)
    if (!res.ok) {
      // El candado del servidor: si falta algo del embudo, se lleva allí.
      if (res.motivo === 'perfil-incompleto' && res.donde) return setAbierta(null), p.ir(res.donde)
      // La pregunta del idioma es otro modal: primero se va la hoja (iOS no abre uno mientras otro se cierra).
      if (res.motivo === TI.MOTIVO) {
        setAbierta(null)
        return void setTimeout(() => setPidiendoIdioma({ id, idioma: res.idioma ?? 'en' }), 450)
      }
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

  const reintentar = async () => {
    setReintentando(true)
    await cargarTodo()
    setReintentando(false)
  }

  // Entrega carga (03-11): nada los primeros 0,4 s; luego el esqueleto, y a los 8 s «Está tardando…».
  const esperando = (!datos || saltaADentro) && !caida
  const esqueleto = useUmbral(esperando)
  const tarda = useTarda(esperando)

  let cuerpo
  if (!datos || saltaADentro || esqueleto) {
    cuerpo = caida && !esqueleto ? (
      <SinRespuesta que={T.sinRespuesta.que} servidor={caida.servidor} alReintentar={reintentar} reintentando={reintentando} />
    ) : esqueleto ? (
      <EsqueletoInicio tarda={tarda ? <Tarda alReintentar={reintentar} /> : null} />
    ) : null
  } else if (vista) {
    // De arriba abajo en tres tandas; lo que viene de lo guardado, sin fundido.
    const sf = deRecuerdo.current
    cuerpo = (
      <>
        <Entra tanda={0} sinFundido={sf}>
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
        </Entra>

        <Seccion onLayout={(y) => (yAgenda.current = y)}>
          <Entra tanda={1} sinFundido={sf}>
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
            misCreditos={datos.creditos}
          />
          </Entra>
        </Seccion>

        <Entra tanda={2} sinFundido={sf}>
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
        </Entra>
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
      {/* Con lo último que viste: se queda en pantalla y la franja dice de cuándo es. */}
      {datos && caida && desde ? (
        <FranjaSinRed cuando={F.deCuandoEs(desde, Date.now())} alReintentar={reintentar} reintentando={reintentando} />
      ) : null}
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
