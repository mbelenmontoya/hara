import './globals.css'
import { Crimson_Pro, Manrope } from 'next/font/google'

const crimsonPro = Crimson_Pro({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata = {
  title: 'Hara Match | Conectá con tu terapeuta ideal',
  description: 'Plataforma que conecta personas con profesionales de bienestar. Encuentra tu terapeuta ideal: recomendaciones personalizadas, profesionales verificados, primero contacto libre.',
  keywords: 'terapia online, psicólogo argentina, terapeuta online, salud mental, bienestar emocional',
  authors: [{ name: 'Hara Match' }],
  creator: 'Hara Match',
  publisher: 'Hara Match',
  openGraph: {
    title: 'Hara Match | Tu terapeuta ideal',
    description: 'Conectamos personas con profesionales de bienestar verificados',
    url: 'https://hara.com',
    siteName: 'Hara Match',
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hara Match',
    description: 'Conectá con tu terapeuta ideal',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${crimsonPro.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  )
}
