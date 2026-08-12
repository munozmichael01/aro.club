import { NextResponse } from 'next/server'
import { z } from 'zod'

import { verificar } from '@/lib/lead-token'
import { valido } from '@/lib/reglas'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Datos base: nombre, cómo le llaman en la mesa, nacimiento, género y
 * teléfono.
 *
 * La pantalla existía desde la entrega 3 pero no la enlazaba nadie y no
 * tenía un solo `fetch`. Nadie podía llegar, y quien llegara no guardaba.
 *
 * No es cosmético: `age` y `gender` son las dos restricciones más duras del
 * reparto —diez años de horquilla y equilibrio de género— y sin este paso
 * llegan nulas. Las dos reglas que más importan estaban desactivadas para
 * todo usuario real.
 *
 * ANTES O DESPUÉS DE TENER CUENTA. Se pedían al final, después de las
 * diecisiete preguntas, y quien terminaba el cuestionario descubría ahí que
 * todavía no podía reservar por no habernos dicho cómo se llama. Lo
 * elaborado iba antes que lo obvio.
 *
 * Ahora se piden justo después del correo, cuando todavía es un lead y no
 * hay contraseña de por medio. Por eso esta ruta atiende a los dos: a quien
 * tiene sesión escribe en `profiles`, y a quien llega con el token del
 * correo escribe en `waitlist` —que ya tenía estas columnas—. Al crear la
 * cuenta, `convertir_lead` las copia solas.
 */

/** Quién pregunta: un miembro con sesión, o un lead con su token. */
type Quien = { tabla: 'profiles'; id: string } | { tabla: 'waitlist'; correo: string }

async function deQuien(url: URL, cuerpoJson?: { correo?: string; token?: string }): Promise<Quien | null> {
  const correo = cuerpoJson?.correo ?? url.searchParams.get('correo')
  const token = cuerpoJson?.token ?? url.searchParams.get('token')

  // LA SESION MANDA sobre el token del correo, y el orden aqui importa: la
  // llave del lead se guarda en el navegador y no se borra al crear la
  // cuenta, asi que un miembro editando sus datos la lleva encima. Con el
  // token primero, sus cambios acabarian en la fila de waitlist y su perfil
  // no cambiaria nunca, sin un solo error. Una sesion es una credencial
  // autenticada; el token solo es un correo firmado.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) return { tabla: 'profiles', id: user.id }

  if (correo && token && verificar(correo, token)) {
    return { tabla: 'waitlist', correo: correo.trim().toLowerCase() }
  }
  return null
}

const NACIMIENTO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha no se entiende.')

const cuerpo = z.object({
  nombre: z.string().trim().min(2).max(120),
  // El trato es lo ÚNICO que ven los otros cinco. Si no lo escribe, se usa
  // su primer nombre, que es lo que la pantalla ya le enseña de sugerencia.
  trato: z.string().trim().max(60).optional(),
  nacimiento: NACIMIENTO,
  genero: z.enum(['mujer', 'hombre', 'no-binario', 'sin-decir']),
  // La misma regla que /api/mi-perfil, que es el mismo dato. Aqui exigia
  // movil venezolano y alli aceptaba cualquier prefijo: quien escribe desde
  // fuera podia editar su telefono en el perfil pero no darse de alta.
  // El §11 lo dice explicito: este campo admite prefijo internacional.
  // Exige el prefijo escrito. Sin el '+' la comprobacion de AroReglas pasaba
  // —solo cuenta digitos— y el fallo saltaba abajo, en el check de la tabla,
  // devolviendo un 500 en vez de decirle a la persona que le falta el
  // prefijo. Normalizar aqui seria adivinar el pais en el servidor.
  telefono: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, 'Escribe el teléfono con el prefijo del país.')
    .refine((v) => valido('telefonoPerfil', v), 'Ese teléfono no se ve bien.'),
})

export async function GET(request: Request) {
  const quien = await deQuien(new URL(request.url))
  if (!quien) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const consulta = createAdminClient()
    .from(quien.tabla)
    .select('full_name, display_name, birthdate, gender, phone_e164')

  const { data } =
    quien.tabla === 'profiles'
      ? await consulta.eq('id', quien.id).maybeSingle()
      : await consulta.eq('email', quien.correo).maybeSingle()

  return NextResponse.json({
    nombre: data?.full_name ?? '',
    trato: data?.display_name ?? '',
    nacimiento: data?.birthdate ?? '',
    // 'sin-decir' es el valor por defecto de la columna, no una respuesta:
    // si nadie eligió, la pantalla debe abrir sin nada marcado.
    genero: data?.birthdate ? (data?.gender ?? null) : null,
    telefono: data?.phone_e164 ?? '',
    completado: Boolean(data?.birthdate && data?.full_name),
  })
}

export async function POST(request: Request) {
  const bruto = (await request.json().catch(() => null)) as
    | { correo?: string; token?: string }
    | null

  const quien = await deQuien(new URL(request.url), bruto ?? undefined)
  if (!quien) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const parsed = cuerpo.safeParse(bruto)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Revisa los datos.' },
      { status: 400 },
    )
  }

  const { nombre, trato, nacimiento, genero, telefono } = parsed.data

  // Dieciocho años. La comprobación ya está en la base como CHECK, pero un
  // 400 con motivo es mejor que un 500 sin él.
  const cumple = new Date(nacimiento)
  const mayoria = new Date()
  mayoria.setFullYear(mayoria.getFullYear() - 18)
  if (Number.isNaN(cumple.getTime()) || cumple > mayoria) {
    return NextResponse.json({ error: 'Hay que tener 18 años.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const campos = {
    full_name: nombre,
    display_name: trato?.trim() || nombre.split(' ')[0],
    birthdate: nacimiento,
    gender: genero,
    phone_e164: telefono,
  }

  const escritura = admin.from(quien.tabla).update(
    quien.tabla === 'waitlist'
      ? // La marca de que este paso esta hecho, para que Mi cuenta no lo
        // vuelva a pedir despues de convertir el lead.
        { ...campos, base_completed_at: new Date().toISOString() }
      : campos,
  )

  const { error } =
    quien.tabla === 'profiles'
      ? await escritura.eq('id', quien.id)
      : await escritura.eq('email', quien.correo)

  if (error) {
    console.error('[datos-base] no se guardó', error)
    return NextResponse.json({ error: 'No pudimos guardar tus datos.' }, { status: 500 })
  }

  // El trigger de `profiles` recalcula los rasgos al cambiar nacimiento o
  // género, así que la edad entra en el reparto sin nada más.
  return NextResponse.json({ estado: 'guardado' })
}
