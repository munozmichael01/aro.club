import type { Metadata } from 'next'
import './globals.css'

import { env } from '@/lib/env'

export const metadata: Metadata = {
  title: {
    default: env.NEXT_PUBLIC_APP_NAME,
    template: `%s · ${env.NEXT_PUBLIC_APP_NAME}`,
  },
  description:
    'Un club para conocer gente en tu ciudad. Elegimos el sitio, armamos el grupo y reservamos a tu nombre.',
  // Los mismos que declara la landing a mano. Van aqui porque `create-next-app`
  // dejo un `src/app/favicon.ico` con el triangulo de Vercel: Next lo trata
  // como fichero especial, lo sirve en /favicon.ico e inyecta su <link> en
  // todo lo que renderiza. La landing se salvaba por declarar el suyo; el
  // resto del sitio llevaba desde el 2 de agosto con el logo de Vercel en la
  // pestana. Borrar el .ico sin poner esto deja las rutas sin ningun icono.
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icono-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

/**
 * Tipografía y color los define el sistema de diseño cuando llegue. Aquí no
 * se fija ninguna fuente a propósito: se usa la pila del sistema para que
 * nada quede elegido por omisión.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // es-VE afecta a la partición de palabras, al corrector del navegador y a
    // los lectores de pantalla.
    <html lang="es-VE" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  )
}
