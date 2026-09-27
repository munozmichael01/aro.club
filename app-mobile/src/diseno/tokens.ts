import type { TextStyle } from 'react-native'

/**
 * Los tokens del sistema de diseño, trasladados de la web.
 *
 * Fuente: `public/Aro Club - Sistema v3.dc.html` (la hoja del sistema) y el
 * recuento de uso real en las veinte pantallas `.dc.html` (27-09). Los
 * contrastes están medidos con la fórmula de WCAG, no copiados de la hoja,
 * que los da inflados en torno a un 7 %.
 *
 * UN valor por papel. Si una maqueta trae un tono que no está aquí, se usa
 * el token del papel y se anota la diferencia (PEDIDO §6 bis).
 */

export const color = {
  // --- Crema: el papel ---------------------------------------------------
  /** Fondo por defecto de todo el producto. */
  crema: '#FAF3E4',
  /** Tarjetas y campos sobre el fondo. Sin sombra. */
  cremaElevada: '#FFFBF0',
  /** Segundo fondo, para separar secciones sin cambiar de tono. */
  cremaFria: '#F2E9D5',

  // --- Verde: la tinta y lo que pesa -----------------------------------
  /** Texto principal y fondo de las secciones que pesan. 12,23:1 sobre crema. */
  verdeProfundo: '#14342A',
  /** Botón primario, enlaces. */
  verde: '#1B5138',
  /**
   * Cuerpo de texto. UNO: 7,95:1 sobre crema, AAA.
   *
   * La web tiene dos (#456352 en la hoja, #33513F en las entregas 3+) y eso
   * es deriva, no sistema. Se eligió el AAA (decisión del 27-09): el texto
   * más largo del producto son siete minutos de lectura, es el de las
   * pantallas más recientes y dobla al otro en uso. Si una maqueta trae
   * #456352, se usa este igual y se anota; no se replica la diferencia.
   */
  cuerpo: '#33513F',
  /** Texto de un botón deshabilitado sobre crema. */
  inerte: '#9DAEA2',
  /** Secundario y terciario: etiquetas, pistas. 5,26:1 sobre crema. */
  secundario: '#566A5D',
  /** Verde claro para texto secundario sobre verde profundo. */
  sobreVerdeSecundario: '#9CBBA6',
  /** Cuerpo sobre verde profundo (las bajadas del registro) y texto deshabilitado sobre verde: el mismo tono. */
  cuerpoSobreVerde: '#C5D8CA',
  /** Aviso sobre verde profundo: el error del campo de correo en el registro. */
  avisoSobreVerde: '#F0BE9C',

  // --- Terracota: el único acento --------------------------------------
  /**
   * Terracota oscura. La que SÍ puede llevar texto pequeño (6,27:1). Siempre
   * significa lo mismo: esto está marcado, o esto es tuyo.
   */
  terracota: '#8F4515',
  /** Relleno de lo marcado (el aro de una opción elegida, la barra actual). */
  terracotaRelleno: '#A0511F',
  /** Terracota clara: solo trazos, anillos y titulares de 24 px o más. */
  terracotaClara: '#C0662F',
  /** Presionado del botón sobre verde. */
  terracotaSobreVerde: '#E39C63',
  /** Texto sobre terracota. */
  sobreTerracota: '#FFF8EA',
} as const

/** Tintes de `verdeProfundo` que la web usa como bordes y velos. */
export const tinta = (alfa: number) => `rgba(20,52,42,${alfa})`
export const verdeAlfa = (alfa: number) => `rgba(27,81,56,${alfa})`
export const cremaAlfa = (alfa: number) => `rgba(250,243,228,${alfa})`
export const terracotaAlfa = (alfa: number) => `rgba(143,69,21,${alfa})`

/**
 * Familias. Los ficheros se llaman como su nombre PostScript para que la
 * familia sea la misma en iOS (que lee el nombre de dentro del fichero) y en
 * Android (que usa el nombre del fichero).
 *
 * Young Serif tiene un solo peso y NO tiene itálica: el énfasis es color o
 * peso, nunca inclinación. En React Native, `fontStyle: 'italic'` sobre ella
 * la falsificaría igual que el navegador.
 */
export const fuente = {
  titular: 'YoungSerif-Regular',
  texto: 'InterTight-Regular',
  textoMedia: 'InterTight-Medium',
  textoSemi: 'InterTight-SemiBold',
  textoNegrita: 'InterTight-Bold',
} as const

/**
 * El interlineado mínimo de cada familia, MEDIDO en los propios TTF (métricas
 * `hhea`: lo que sube por encima de la línea base —ascendentes y tildes— más
 * lo que baja): Young Serif 1,046 + 0,366 = 1,412; Inter Tight 0,969 + 0,241
 * = 1,210.
 *
 * Por qué hace falta: en CSS, un `line-height` menor que la letra solo
 * solapa líneas y la letra se pinta entera; en React Native el `lineHeight`
 * RECORTA la caja, y se comen las ascendentes y las tildes. La web usa 0,94
 * en la portada y en el celular salía cortada (lo vio Michael el 27-09). Por
 * debajo de este suelo no se baja, aunque la hoja diga menos.
 */
export const SUELO_INTERLINEADO: Record<string, number> = {
  [fuente.titular]: 1.42,
  [fuente.texto]: 1.21,
  [fuente.textoMedia]: 1.21,
  [fuente.textoSemi]: 1.21,
  [fuente.textoNegrita]: 1.21,
}

/**
 * La escala tipográfica, con los tamaños de celular: el mínimo de cada
 * `clamp()` de la hoja, que es lo que la web pinta a 390 px. En React Native
 * el interlineado y el espaciado son absolutos, así que se derivan aquí del
 * tamaño con las mismas proporciones que la hoja, nunca por debajo del suelo
 * de la familia (`SUELO_INTERLINEADO`).
 */
function estilo(familia: string, tam: number, interlineado: number, espaciadoEm = 0) {
  const suelo = SUELO_INTERLINEADO[familia] ?? 1.21
  return {
    fontFamily: familia,
    fontSize: tam,
    lineHeight: Math.max(Math.round(tam * interlineado), Math.ceil(tam * suelo)),
    letterSpacing: +(tam * espaciadoEm).toFixed(2),
  }
}

export const tipo = {
  /**
   * El titular de la portada. La web usa 44 con interlineado 0,94; en el
   * celular el suelo de 1,42 hacía crecer el bloque un 50 %, así que el aire
   * se saca del tamaño y no del interlineado (decisión del 27-09).
   */
  portada: estilo(fuente.titular, 34, 0.94, -0.04),
  /** Los titulares del registro: «Empecemos por tu correo.». Mismo criterio: 36 → 30. */
  titularGrande: estilo(fuente.titular, 30, 0.98, -0.035),
  display: estilo(fuente.titular, 30, 1, -0.035),
  titulo: estilo(fuente.titular, 25, 1.05, -0.03),
  subtitulo: estilo(fuente.titular, 23, 1.15, -0.02),
  /** «Aro Club» junto a la marca, en la cabecera. */
  marca: estilo(fuente.titular, 19, 1.05, -0.02),
  cuerpoGrande: estilo(fuente.texto, 17, 1.55),
  cuerpo: estilo(fuente.texto, 15, 1.6),
  /** Texto de apoyo: avisos, pasos pendientes. */
  cuerpoChico: estilo(fuente.texto, 14, 1.5),
  /** Lo más pequeño que se lee: garantías, chips. */
  nota: estilo(fuente.texto, 13, 1.5),
  /** El texto de cada pregunta del cuestionario. */
  pregunta: estilo(fuente.textoSemi, 17, 1.35, -0.01),
  /** Un título dentro de una lista (el paso pendiente). */
  rotulo: estilo(fuente.textoSemi, 15, 1.3),
  etiqueta: estilo(fuente.textoMedia, 12, 1.25, 0.14),
  etiquetaChica: estilo(fuente.textoMedia, 11, 1.25, 0.14),
  /** El texto de un chip: «Lo ven los cinco». */
  chip: estilo(fuente.textoMedia, 12, 1.25),
  cifra: { ...estilo(fuente.textoNegrita, 28, 1, -0.04), fontVariant: ['tabular-nums'] },
  /** Lo que se teclea en un campo de cifras: el día, el año. */
  cifraCampo: { ...estilo(fuente.textoSemi, 20, 1.2, -0.02), fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>

/** Radios. Cápsula para botones y fichas; 20–22 para tarjetas. */
export const radio = {
  capsula: 999,
  tarjeta: 22,
  bloque: 20,
} as const

/**
 * Tamaños que no se negocian. 44 es el suelo de cualquier área de toque;
 * los botones de la hoja miden 52.
 */
export const medida = {
  toqueMinimo: 44,
  boton: 52,
  opcion: 56,
  margenLateral: 16,
} as const

/** Tiempos, con el porqué de cada uno en `Velo.tsx` y `AroCarga.tsx`. */
export const tiempo = {
  vueltaAro: 1500,
  veloMinimo: 500,
  veloTope: 6000,
  transicion: 180,
} as const
