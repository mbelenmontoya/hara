import './globals.css'
import { Poppins, Montserrat } from 'next/font/google'
import Script from 'next/script'
import { SiteHeader } from '@/app/components/SiteHeader'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

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
  title: 'Hara Vital | Bienestar holístico en Argentina',
  description: 'El directorio de terapias alternativas y bienestar holístico en Argentina. Reiki, masajes terapéuticos, constelaciones familiares, diseño humano y más. Encontrá tu práctica ideal.',
  keywords: 'reiki argentina, masajes terapéuticos, constelaciones familiares, diseño humano, registros akáshicos, bienestar holístico, terapias alternativas, terapia energética',
  authors: [{ name: 'Hara Vital' }],
  creator: 'Hara Vital',
  publisher: 'Hara Vital',
  openGraph: {
    title: 'Hara Vital | Bienestar holístico en Argentina',
    description: 'Directorio curado de terapias alternativas en Argentina. Reiki, masajes, constelaciones familiares, diseño humano y más.',
    url: 'https://haravital.app',
    siteName: 'Hara Vital',
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hara Vital',
    description: 'El directorio de terapias alternativas en Argentina. Encontrá tu práctica de bienestar ideal.',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/assets/logo/isotipo.png',
    shortcut: '/assets/logo/isotipo.png',
    apple: '/assets/logo/isotipo.png',
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
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
