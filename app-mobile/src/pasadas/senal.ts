import { useSyncExternalStore } from 'react'

/**
 * El punto de «hay algo nuevo» (entrega mi-mesa-pasadas, N): en la barra de
 * abajo, en la pestaña Pasadas y en Mis cenas de Perfil a la vez. Lo dice el
 * servidor (`senalPasadas` de /api/mi-mesa, `senal` de /api/pasadas); quien lo
 * lea primero lo deja aquí y las tres lo pintan igual.
 */
let senal = false
const oyentes = new Set<() => void>()

export function ponerSenal(v: boolean | null | undefined) {
  if (typeof v !== 'boolean' || v === senal) return
  senal = v
  oyentes.forEach((o) => o())
}

export function useSenal(): boolean {
  return useSyncExternalStore(
    (o) => (oyentes.add(o), () => void oyentes.delete(o)),
    () => senal,
    () => senal,
  )
}
