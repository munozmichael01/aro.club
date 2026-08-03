import { z } from 'zod'

/**
 * Validación de variables de entorno al arrancar.
 *
 * Las `NEXT_PUBLIC_*` se sustituyen en tiempo de compilación, así que hay que
 * nombrarlas literalmente: `process.env[nombre]` no funciona en el navegador.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  // Con valor por defecto: en Vercel solo hacen falta las dos de Supabase
  // para que el despliegue levante.
  NEXT_PUBLIC_SITE_URL: z.string().min(1).default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default('Aro Club'),
})

const parsedPublic = publicSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
})

if (!parsedPublic.success) {
  throw new Error(
    `Faltan variables de entorno públicas:\n${parsedPublic.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')}\n\nRevisa .env.local (usa .env.example como plantilla).`,
  )
}

export const env = parsedPublic.data

/**
 * Secretos de servidor. Se leen bajo demanda y nunca en el ámbito de un módulo
 * que pueda acabar en un bundle de cliente.
 */
export function serverEnv() {
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv() no puede invocarse desde el navegador.')
  }

  const schema = z.object({
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  })

  const parsed = schema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  })

  if (!parsed.success) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor.')
  }

  return parsed.data
}
