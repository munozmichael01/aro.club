import { useState, type ReactNode } from 'react'
import { Linking, Pressable, StyleSheet, TextInput, View } from 'react-native'

import {
  Boton,
  IconoCerrado,
  IconoCheck,
  IconoInstagram,
  IconoLapiz,
  IconoReloj,
  IconoSale,
  IconoSinCruce,
  IconoTelefono,
  IconoTiktok,
  Texto,
  color,
  cremaAlfa,
  fuente,
  medida,
  tinta,
} from '../diseno'
import { reglas } from '../reglas'
import * as M from './maquina'

const C = reglas.CONTACTO

/** Los fondos de las iniciales, en el orden de la maqueta. */
const FONDOS = ['#DCE6DD', '#F6D9B4', '#C5D8CA', '#ECE3CF', '#F2D5C4']
const MELOCOTON = '#F6D9B4'
const SALVIA = '#E4ECE4'
const PAPEL = '#FFF8EA'

/**
 * «¿Qué le compartimos?» (entrega mi-mesa-pasadas, 31-10, que trae el panel de
 * seguir-en-contacto con los cambios de Michael): A a E con una persona, y el
 * de varias (V3 a V5). El estado lo decide el servidor; cada acción responde
 * el objeto entero y la pantalla se vuelve a pintar con él.
 */
export function PanelContacto(p: {
  d: M.DeContacto
  ahora: number
  alAccion: (a: M.Accion) => Promise<{ ok: true } | { ok: false; error: string; campo?: string }>
  ir: (destino: string) => void
}) {
  const [editando, setEditando] = useState(false)
  const v = M.panel(p.d)
  if (v.tipo === 'nada') return null
  const zona = p.d.cena.zonaHoraria
  const cierra = M.cierraDe(p.d)

  // El formulario: A, o «Cambiar lo que comparto» desde B (o desde V5).
  if ((v.tipo === 'una' && v.p.estado === 'A') || (v.tipo === 'varias' && v.formulario) || editando) {
    const abiertas = p.d.personas.filter((x) => x.estado !== 'C' && x.estado !== 'D')
    return (
      <Formulario
        personas={abiertas}
        misDatos={p.d.misDatos}
        cierra={cierra}
        zona={zona}
        ahora={p.ahora}
        alCompartir={async (cuerpo) => {
          const r = await p.alAccion(cuerpo)
          if (r.ok) setEditando(false)
          return r
        }}
        alNo={async () => {
          const r = await p.alAccion({ accion: 'no', con: abiertas.map((x) => x.id) })
          if (r.ok) setEditando(false)
          return r
        }}
      />
    )
  }

  if (v.tipo === 'varias') return <Varias d={p.d} alCambiar={() => setEditando(true)} alAccion={p.alAccion} />

  const q = v.p
  if (q.estado === 'B')
    return (
      <View style={{ gap: 14 }}>
        <Titulo bajada={C.B.bajada}>{C.B.titulo(q.nombre)}</Titulo>
        <View style={e.tarjeta}>
          <Etiqueta>{C.B.loQueVas}</Etiqueta>
          <MisDatos d={p.d.misDatos} />
          <View style={{ height: 1, backgroundColor: tinta(0.1) }} />
          <Pressable onPress={() => setEditando(true)} accessibilityRole="button" style={e.enlaceCentro}>
            <Texto style={[e.semi, { fontSize: 15, color: color.verde }]}>{C.B.cambiar}</Texto>
          </Pressable>
        </View>
        {q.cierraEn ? <Pastilla fondo={SALVIA}>{C.plazoDeOtra(q.nombre, q.cierraEn, zona)}</Pastilla> : null}
        <Nota fondo={SALVIA}>{C.B.enCualquierCaso}</Nota>
        <Subrayado texto={C.B.prefieroNo} onPress={() => p.alAccion({ accion: 'no', con: [q.id] })} />
      </View>
    )

  if (q.estado === 'C') return <Cruzados p={q} misDatos={p.d.misDatos} />

  if (q.estado === 'D')
    return (
      <View style={{ gap: 14 }}>
        <IconoSinCruce />
        <Titulo bajada={C.D.bajada}>{C.D.titulo}</Titulo>
        <Texto style={{ fontSize: 15, lineHeight: 22, color: color.cuerpo }}>{C.D.agenda}</Texto>
        <Boton texto={C.D.verAgenda} ancho onPress={() => p.ir('/cuenta#agenda')} />
      </View>
    )

  // E: eligió no. Se puede deshacer mientras dure el plazo.
  return (
    <View style={{ gap: 14 }}>
      <Titulo bajada={C.E.bajada(q.nombre)}>{C.E.titulo}</Titulo>
      {q.cierraEn ? <Pastilla fondo={MELOCOTON}>{C.E.puedesCambiar(q.cierraEn, zona)}</Pastilla> : null}
      <Boton tipo="secundario" texto={C.E.elegir} ancho onPress={() => p.alAccion({ accion: 'reabrir', con: [q.id] })} />
    </View>
  )
}

// --- A: el formulario, de una o de varias -----------------------------------

function Formulario(p: {
  personas: M.Persona[]
  misDatos: M.DeContacto['misDatos']
  cierra: string | null
  zona: string | null
  ahora: number
  alCompartir: (a: M.Accion) => Promise<{ ok: true } | { ok: false; error: string; campo?: string }>
  alNo: () => Promise<unknown>
}) {
  const varias = p.personas.length > 1
  const [telefono, setTelefono] = useState(p.misDatos.telefono ?? '')
  const [instagram, setInstagram] = useState(M.sinArroba(p.misDatos.instagram))
  const [tiktok, setTiktok] = useState(M.sinArroba(p.misDatos.tiktok))
  // Todas marcadas al entrar (V3); desmarcar es su E, sin avisar a nadie.
  const [marcadas, setMarcadas] = useState<string[]>(() => p.personas.map((x) => x.id))
  const [fallo, setFallo] = useState<{ error: string; campo?: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const nombre = p.personas[0]?.nombre ?? ''
  const nombresMarcadas = p.personas.filter((x) => marcadas.includes(x.id)).map((x) => x.nombre)

  const compartir = async () => {
    if (enviando || !marcadas.length) return
    if (!telefono.trim()) return setFallo({ error: C.A.telefonoFalta, campo: 'telefono' })
    setEnviando(true)
    setFallo(null)
    const sin = p.personas.filter((x) => !marcadas.includes(x.id)).map((x) => x.id)
    const r = await p.alCompartir(M.cuerpoCompartir({ telefono, instagram, tiktok }, marcadas, sin))
    setEnviando(false)
    if (!r.ok) setFallo({ error: r.error, campo: r.campo })
  }

  const errorDe = (campo: string) => (fallo?.campo === campo ? fallo.error : null)

  return (
    <View style={{ gap: 10 }}>
      <Texto variante="titularGrande" accessibilityRole="header">
        {varias ? C.A.tituloVarios : C.A.titulo(nombre)}
      </Texto>
      {p.cierra ? <Pastilla fondo={MELOCOTON}>{C.quedan(p.cierra, p.zona, p.ahora)}</Pastilla> : null}

      <View style={[e.tarjeta, { borderWidth: 1.5, borderColor: color.verdeProfundo, padding: 12, gap: 8 }]}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <IconoTelefono tam={24} color={color.verdeProfundo} />
          <View style={{ flex: 1, gap: 4 }}>
            <Texto style={[e.semi, { fontSize: 16, lineHeight: 20 }]}>{C.A.telefono(varias)}</Texto>
            <Texto style={{ fontSize: 12.5, lineHeight: 16, color: color.secundario }}>{C.A.telefonoNota}</Texto>
          </View>
        </View>
        <View style={[e.campoTelefono, errorDe('telefono') ? { borderColor: color.terracota } : null]}>
          <TextInput
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
            autoComplete="tel"
            accessibilityLabel={C.A.telefono(varias)}
            style={e.entrada}
          />
          <IconoLapiz color={color.secundario} />
        </View>
        {errorDe('telefono') ? <Texto variante="cuerpoChico" tono="terracota">{errorDe('telefono')}</Texto> : null}
      </View>

      <View style={{ gap: 8 }}>
        <Etiqueta>{C.A.redes}</Etiqueta>
        <Red icono={<IconoInstagram color={color.verdeProfundo} />} valor={instagram} poner={setInstagram} nombre="Instagram" error={errorDe('instagram')} />
        <Red icono={<IconoTiktok color={color.verdeProfundo} />} valor={tiktok} poner={setTiktok} nombre="TikTok" error={errorDe('tiktok')} />
      </View>

      {varias ? (
        <View style={{ gap: 6 }}>
          <Etiqueta>{C.A.seLoMandamos}</Etiqueta>
          {p.personas.map((x, i) => {
            const on = marcadas.includes(x.id)
            return (
              <Pressable
                key={x.id}
                onPress={() => setMarcadas((m) => (on ? m.filter((y) => y !== x.id) : [...m, x.id]))}
                accessibilityRole="checkbox"
                aria-checked={on}
                style={[e.persona, { borderColor: on ? color.verdeProfundo : tinta(0.12) }]}
              >
                <Inicial letra={x.nombre[0] ?? '·'} fondo={FONDOS[i % FONDOS.length]} tam={30} />
                <Texto style={[e.semi, { flex: 1, fontSize: 16, opacity: on ? 1 : 0.55 }]}>{x.nombre}</Texto>
                <View style={[e.caja, { backgroundColor: on ? color.verdeProfundo : 'transparent' }]}>{on ? <IconoCheck tam={15} color={color.crema} /> : null}</View>
              </Pressable>
            )
          })}
          <Nota>{C.A.soloAQuien}</Nota>
        </View>
      ) : (
        <Nota fondo={SALVIA}>{C.A.soloSi(nombre)}</Nota>
      )}

      {fallo && !fallo.campo ? <Texto variante="cuerpoChico" tono="terracota">{fallo.error}</Texto> : null}

      <View style={{ gap: 2 }}>
        <Boton
          texto={varias ? C.A.compartirCon(nombresMarcadas, p.personas.length) : C.A.compartir}
          ancho
          onPress={compartir}
          apagado={enviando || !marcadas.length}
        />
        <Subrayado texto={varias ? C.A.prefieroNoNadie : C.A.prefieroNo} onPress={() => p.alNo()} />
        {varias ? null : <Texto style={{ textAlign: 'center', fontSize: 12.5, lineHeight: 17, color: color.secundario }}>{C.A.noSeEntera(nombre)}</Texto>}
      </View>
    </View>
  )
}

function Red(p: { icono: ReactNode; valor: string; poner: (v: string) => void; nombre: string; error: string | null }) {
  const lleno = !!p.valor.trim()
  return (
    <View style={{ gap: 4 }}>
      <View style={[e.red, { borderColor: p.error ? color.terracota : lleno ? color.verdeProfundo : tinta(0.14) }]}>
        {p.icono}
        <Texto style={{ fontFamily: fuente.textoMedia, fontSize: 16, color: color.secundario }}>@</Texto>
        <TextInput
          value={p.valor}
          onChangeText={(t) => p.poner(t.replace(/^@+/, ''))}
          placeholder={p.nombre}
          placeholderTextColor={color.inerte}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={p.nombre}
          style={e.entrada}
        />
        <Texto style={{ fontSize: 12, color: color.secundario }}>{C.A.opcional}</Texto>
      </View>
      {p.error ? <Texto variante="cuerpoChico" tono="terracota">{p.error}</Texto> : null}
    </View>
  )
}

// --- C: lo que se compartieron ---------------------------------------------

function Cruzados({ p, misDatos }: { p: M.Persona; misDatos: M.Datos }) {
  const s = p.suyos
  return (
    <View style={{ gap: 14 }}>
      <Titulo bajada={C.C.bajada}>{C.C.titulo(p.nombre)}</Titulo>
      {s ? (
        <View style={e.oscura}>
          <Texto style={[e.etiqueta, { color: color.terracotaSobreVerde }]}>{C.C.teDejo(p.nombre)}</Texto>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconoTelefono tam={24} color={color.crema} />
            <Texto style={{ flex: 1, fontFamily: fuente.titular, fontSize: 22, lineHeight: 32, color: color.crema }}>{s.telefono}</Texto>
          </View>
          <Pressable onPress={() => Linking.openURL(C.enlaces.whatsapp(s.telefono))} accessibilityRole="link" style={e.whatsapp}>
            <Texto style={[e.semi, { fontSize: 15, color: color.verdeProfundo }]}>{C.C.whatsapp}</Texto>
            <IconoSale color={color.verdeProfundo} />
          </Pressable>
          {s.instagram ? <RedSuya icono={<IconoInstagram color={color.crema} />} red="Instagram" usuario={M.sinArroba(s.instagram)} url={C.enlaces.instagram(M.sinArroba(s.instagram))} /> : null}
          {s.tiktok ? <RedSuya icono={<IconoTiktok color={color.crema} />} red="TikTok" usuario={M.sinArroba(s.tiktok)} url={C.enlaces.tiktok(M.sinArroba(s.tiktok))} /> : null}
        </View>
      ) : null}
      <View style={[e.tarjeta, { gap: 10, paddingVertical: 14 }]}>
        <Etiqueta>{C.C.leDejaste}</Etiqueta>
        <MisDatos d={misDatos} tam={20} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <IconoCerrado color={color.cuerpo} />
        <Texto style={{ flex: 1, fontSize: 13.5, lineHeight: 19, color: color.cuerpo }}>{C.C.nota}</Texto>
      </View>
    </View>
  )
}

function RedSuya(p: { icono: ReactNode; red: string; usuario: string; url: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: cremaAlfa(0.14), paddingTop: 12 }}>
      {p.icono}
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Texto style={{ fontFamily: fuente.textoMedia, fontSize: 12, lineHeight: 15, color: color.sobreVerdeSecundario }}>{p.red}</Texto>
        <Texto numberOfLines={1} style={{ fontFamily: fuente.titular, fontSize: 19, lineHeight: 27, color: color.crema }}>
          @{p.usuario}
        </Texto>
      </View>
      <Pressable onPress={() => Linking.openURL(p.url)} accessibilityRole="link" accessibilityLabel={`${C.C.abrir} ${p.red}`} style={e.abrir}>
        <Texto style={[e.semi, { fontSize: 14, color: color.crema }]}>{C.C.abrir}</Texto>
        <IconoSale tam={13} color={color.crema} />
      </Pressable>
    </View>
  )
}

// --- Varias personas, cada una con su estado (V5) --------------------------

function Varias(p: { d: M.DeContacto; alCambiar: () => void; alAccion: (a: M.Accion) => Promise<unknown> }) {
  const zona = p.d.cena.zonaHoraria
  const compartirCon = (id: string) => p.alAccion({ ...M.cuerpoCompartir({ telefono: p.d.misDatos.telefono, instagram: p.d.misDatos.instagram ?? '', tiktok: p.d.misDatos.tiktok ?? '' }, [id], []) })
  return (
    <View style={{ gap: 10 }}>
      <Texto variante="titularGrande" accessibilityRole="header" style={{ marginTop: 4 }}>
        {C.B.aSuRitmo}
      </Texto>
      <Texto style={{ fontSize: 15, lineHeight: 22, color: color.cuerpo }}>{C.B.teAvisamos}</Texto>
      {p.d.personas.map((x, i) => {
        const fondo = FONDOS[i % FONDOS.length]
        if (x.estado === 'C' && x.suyos) {
          const s = x.suyos
          return (
            <View key={x.id} style={[e.oscura, { padding: 14, paddingHorizontal: 16, gap: 10 }]}>
              <Cabeza nombre={x.nombre} fondo={fondo} sello={C.sellos.C} selloFondo={color.sobreVerdeSecundario} claro conCheck />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: cremaAlfa(0.14), paddingTop: 10 }}>
                <IconoTelefono tam={20} color={color.crema} />
                <Texto style={{ flex: 1, fontFamily: fuente.textoMedia, fontSize: 15, color: color.crema }}>{s.telefono}</Texto>
                <Pressable onPress={() => Linking.openURL(C.enlaces.whatsapp(s.telefono))} accessibilityRole="link" style={[e.pildoraAccion, { backgroundColor: color.terracotaSobreVerde }]}>
                  <Texto style={[e.semi, { fontSize: 13.5, color: color.verdeProfundo }]}>WhatsApp</Texto>
                </Pressable>
              </View>
              {s.instagram ? <RedCorta icono={<IconoInstagram tam={20} color={color.crema} />} usuario={M.sinArroba(s.instagram)} url={C.enlaces.instagram(M.sinArroba(s.instagram))} /> : null}
              {s.tiktok ? <RedCorta icono={<IconoTiktok tam={20} color={color.crema} />} usuario={M.sinArroba(s.tiktok)} url={C.enlaces.tiktok(M.sinArroba(s.tiktok))} /> : null}
            </View>
          )
        }
        return (
          <View key={x.id} style={[e.tarjeta, { paddingVertical: 14, gap: 6 }]}>
            <Cabeza
              nombre={x.nombre}
              fondo={fondo}
              sello={x.estado === 'A' ? C.sellos.A : x.estado === 'B' ? C.sellos.B : x.estado === 'D' ? C.sellos.D : C.sellos.E}
              // A: te toca responder mientras ya compartiste con otras. En melocotón, como ESPERANDO.
              selloFondo={x.estado === 'A' || x.estado === 'B' ? MELOCOTON : '#ECE3CF'}
              conReloj={x.estado === 'B'}
            />
            {x.estado === 'B' && x.cierraEn ? (
              <Texto style={{ fontSize: 13.5, lineHeight: 19, color: color.cuerpo, paddingLeft: 40 }}>{C.plazoDeOtra(x.nombre, x.cierraEn, zona)}</Texto>
            ) : null}
            {/* E (o una coincidencia nueva sin responder): compartir también, con los datos ya guardados. */}
            {x.estado === 'E' || x.estado === 'A' ? (
              <Pressable onPress={() => compartirCon(x.id)} accessibilityRole="button" style={{ minHeight: 40, justifyContent: 'center', paddingLeft: 40 }}>
                <Texto style={[e.semi, { fontSize: 14, color: color.verde, textDecorationLine: 'underline' }]}>{C.compartirTambien(x.nombre)}</Texto>
              </Pressable>
            ) : null}
          </View>
        )
      })}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: tinta(0.12), paddingTop: 12, paddingHorizontal: 2 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Etiqueta>{C.loQueCompartes}</Etiqueta>
          <Texto style={{ fontFamily: fuente.textoMedia, fontSize: 14.5, lineHeight: 19, color: color.verdeProfundo }}>{M.resumen(p.d.misDatos)}</Texto>
        </View>
        <Pressable onPress={p.alCambiar} accessibilityRole="button" style={{ minHeight: medida.toqueMinimo, justifyContent: 'center' }}>
          <Texto style={[e.semi, { fontSize: 14, color: color.verde }]}>{C.cambiar}</Texto>
        </Pressable>
      </View>
    </View>
  )
}

function Cabeza(p: { nombre: string; fondo: string; sello: string; selloFondo: string; claro?: boolean; conCheck?: boolean; conReloj?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Inicial letra={p.nombre[0] ?? '·'} fondo={p.fondo} tam={30} />
      <Texto style={{ flex: 1, fontFamily: fuente.titular, fontSize: 19, lineHeight: 27, color: p.claro ? color.crema : color.verdeProfundo }}>{p.nombre}</Texto>
      <View style={[e.sello, { backgroundColor: p.selloFondo }]}>
        {p.conCheck ? <IconoCheck tam={11} color={color.verdeProfundo} /> : null}
        {p.conReloj ? <IconoReloj tam={11} color={color.verdeProfundo} /> : null}
        <Texto style={{ fontFamily: fuente.textoNegrita, fontSize: 10.5, lineHeight: 13, letterSpacing: 0.84, color: p.claro ? color.verdeProfundo : color.secundario }}>{p.sello}</Texto>
      </View>
    </View>
  )
}

function RedCorta(p: { icono: ReactNode; usuario: string; url: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {p.icono}
      <Texto style={{ flex: 1, fontFamily: fuente.textoMedia, fontSize: 15, color: color.crema }}>@{p.usuario}</Texto>
      <Pressable onPress={() => Linking.openURL(p.url)} accessibilityRole="link" style={[e.pildoraAccion, { borderWidth: 1.5, borderColor: color.crema }]}>
        <Texto style={[e.semi, { fontSize: 13.5, color: color.crema }]}>{C.C.abrir}</Texto>
      </Pressable>
    </View>
  )
}

// --- Piezas -----------------------------------------------------------------

function Titulo({ children, bajada }: { children: string; bajada: string }) {
  return (
    <View style={{ gap: 10 }}>
      <Texto variante="titularGrande" accessibilityRole="header">
        {children}
      </Texto>
      <Texto style={{ fontSize: 16, lineHeight: 23, color: color.cuerpo }}>{bajada}</Texto>
    </View>
  )
}

function MisDatos({ d, tam = 22 }: { d: M.Datos; tam?: number }) {
  const fila = (icono: ReactNode, texto: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {icono}
      <Texto style={{ flex: 1, fontFamily: fuente.textoMedia, fontSize: 16, lineHeight: 20, color: color.verdeProfundo }}>{texto}</Texto>
    </View>
  )
  return (
    <>
      {fila(<IconoTelefono tam={tam} color={color.verdeProfundo} />, d.telefono)}
      {d.instagram ? fila(<IconoInstagram tam={tam} color={color.verdeProfundo} />, '@' + M.sinArroba(d.instagram)) : null}
      {d.tiktok ? fila(<IconoTiktok tam={tam} color={color.verdeProfundo} />, '@' + M.sinArroba(d.tiktok)) : null}
    </>
  )
}

function Pastilla({ children, fondo }: { children: string; fondo: string }) {
  return (
    <View style={[e.pastilla, { backgroundColor: fondo }]}>
      <View style={{ flexShrink: 0 }}>
        <IconoReloj tam={16} color={color.verdeProfundo} />
      </View>
      <Texto style={[e.semi, { flexShrink: 1, fontSize: 13, lineHeight: 17 }]}>{children}</Texto>
    </View>
  )
}

function Nota({ children, fondo }: { children: string; fondo?: string }) {
  return (
    <View style={[{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }, fondo ? { backgroundColor: fondo, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14 } : { paddingHorizontal: 2 }]}>
      <View style={{ flexShrink: 0 }}>
        <IconoCerrado tam={fondo ? 20 : 16} color={fondo ? color.verdeProfundo : color.cuerpo} />
      </View>
      <Texto style={{ flex: 1, fontSize: 13.5, lineHeight: 19, color: fondo ? color.verdeProfundo : color.cuerpo }}>{children}</Texto>
    </View>
  )
}

function Subrayado({ texto, onPress }: { texto: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={e.enlaceCentro}>
      <Texto style={[e.semi, { fontSize: 15, textDecorationLine: 'underline' }]}>{texto}</Texto>
    </Pressable>
  )
}

function Etiqueta({ children }: { children: string }) {
  return <Texto style={[e.etiqueta, { color: color.secundario }]}>{children}</Texto>
}

export function Inicial({ letra, fondo, tam = 30 }: { letra: string; fondo: string; tam?: number }) {
  return (
    <View style={{ width: tam, height: tam, borderRadius: tam / 2, backgroundColor: fondo, alignItems: 'center', justifyContent: 'center' }}>
      <Texto style={{ fontFamily: fuente.titular, fontSize: tam / 2, lineHeight: Math.ceil((tam / 2) * 1.42), color: color.verdeProfundo }}>{letra.toUpperCase()}</Texto>
    </View>
  )
}

const e = StyleSheet.create({
  semi: { fontFamily: fuente.textoSemi, color: color.verdeProfundo },
  etiqueta: { fontFamily: fuente.textoNegrita, fontSize: 11, lineHeight: 14, letterSpacing: 1.54 },
  tarjeta: { borderRadius: 20, backgroundColor: PAPEL, borderWidth: 1, borderColor: tinta(0.12), padding: 16, gap: 12 },
  oscura: { borderRadius: 22, backgroundColor: color.verdeProfundo, padding: 18, gap: 12 },
  campoTelefono: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, backgroundColor: color.crema, borderWidth: 1, borderColor: tinta(0.2), paddingHorizontal: 14, minHeight: medida.toqueMinimo },
  entrada: { flex: 1, minWidth: 0, fontFamily: fuente.textoMedia, fontSize: 16, color: color.verdeProfundo, paddingVertical: 12 },
  red: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, backgroundColor: PAPEL, borderWidth: 1.5, paddingHorizontal: 14, minHeight: 46 },
  persona: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, backgroundColor: PAPEL, borderWidth: 1.5, paddingHorizontal: 14, minHeight: medida.toqueMinimo },
  caja: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: color.verdeProfundo, alignItems: 'center', justifyContent: 'center' },
  pastilla: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, paddingVertical: 8, paddingLeft: 11, paddingRight: 14, maxWidth: '100%' },
  enlaceCentro: { minHeight: medida.toqueMinimo, alignItems: 'center', justifyContent: 'center' },
  whatsapp: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50, borderRadius: 999, backgroundColor: color.terracotaSobreVerde },
  abrir: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: medida.toqueMinimo, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1.5, borderColor: color.crema },
  pildoraAccion: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  sello: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 },
})
