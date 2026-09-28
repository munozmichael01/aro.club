import { useRef } from 'react'

/**
 * La última versión de un valor, SIN que cuente como dependencia de un
 * efecto. Para los callbacks que llegan por props (`alEntrar`): quien monta
 * la pantalla los escribe en línea y son nuevos cada vez que ESE padre se
 * pinta; metidos en las dependencias de la carga, cada repintado del padre
 * (la barra de pestañas, al enfocar) relanzaría la carga sin motivo.
 */
export function useUltimo<T>(valor: T) {
  const r = useRef(valor)
  r.current = valor
  return r
}
