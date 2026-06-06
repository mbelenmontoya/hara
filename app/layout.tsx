import './globals.css'
import { Poppins, Montserrat } from 'next/font/google'
import Script from 'next/script'
import { SiteHeader } from '@/app/components/SiteHeader'

// Poppins — brand display font (titles, headings, nav)
const poppins = Poppins({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

// Montserrat — brand body font (reading text, UI labels)
const montserrat = Montserrat({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata = {
  title: 'Hara Vital | Conectá con tu terapeuta ideal',
  description: 'Plataforma que conecta personas con profesionales de bienestar. Encuentra tu terapeuta ideal: recomendaciones personalizadas, profesionales verificados, primero contacto libre.',
  keywords: 'terapia online, psicólogo argentina, terapeuta online, salud mental, bienestar emocional',
  authors: [{ name: 'Hara Vital' }],
  creator: 'Hara Vital',
  publisher: 'Hara Vital',
  openGraph: {
    title: 'Hara Vital | Tu terapeuta ideal',
    description: 'Conectamos personas con profesionales de bienestar verificados',
    url: 'https://hara.com',
    siteName: 'Hara Vital',
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hara Vital',
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
    <html lang="es" className={`${poppins.variable} ${montserrat.variable}`}>
      <body>
        <SiteHeader />
        {children}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-67WHY8ZN8J"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-67WHY8ZN8J');
          `}
        </Script>
      </body>
    </html>
  )
}
