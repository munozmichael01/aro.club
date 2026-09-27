import { almacenSeguro } from './almacen'

/**
 * La llave del lead: el correo y el token firmado que da `/api/lead` a quien
 * deja su correo por primera vez. Es lo que la web guarda en `aro-sesion`;
 * aquí va al llavero, como la sesión, porque con ella se leen y escriben
 * los datos de esa persona.
 */
export const CLAVE_LEAD = 'aro.lead'

export type Lead = { correo: string; token: string }

export async function leerLead(): Promise<Lead | null> {
  try {
    const s = JSON.parse((await almacenSeguro.getItem(CLAVE_LEAD)) ?? 'null')
    return s && s.correo && s.token ? s : null
  } catch {
    return null
  }
}

export async function guardarLead(lead: Lead): Promise<void> {
  await almacenSeguro.setItem(CLAVE_LEAD, JSON.stringify(lead))
}
