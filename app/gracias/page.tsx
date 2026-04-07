// Hará Match — Post-solicitud confirmation
// Shown after successful intake form submission

import { PageBackground } from '@/app/components/ui/PageBackground'

export default function GraciasPage() {
  return (
    <div className="min-h-screen bg-background">
      <PageBackground />

      {/* Content */}
      <div className="relative z-10 max-w-md mx-auto px-4 pt-8 pb-12">

        <h1 className="text-2xl font-semibold text-foreground mb-3 text-center">
          ¡Recibimos tu solicitud!
        </h1>

        <p className="text-muted leading-relaxed mb-8 text-center max-w-sm mx-auto">
          Vamos a buscar profesionales que se ajusten a lo que nos contaste.
          Te contactamos por WhatsApp con tus 3 recomendaciones.
        </p>

        <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 w-full max-w-md overflow-hidden p-8">

          <p className="text-sm font-semibold text-foreground mb-4">
            ¿Qué sigue?
          </p>

          <div className="flex flex-col items-start text-left">
            {/* Step 1 */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-success" />
                <div className="w-px h-8 bg-white" />
              </div>
              <p className="text-sm text-foreground -mt-0.5">Analizamos lo que buscás</p>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-white" />
                <div className="w-px h-8 bg-white" />
              </div>
              <p className="text-sm text-muted -mt-0.5">Seleccionamos 3 profesionales para vos</p>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-white" />
                <div className="w-px h-8 bg-white" />
              </div>
              <p className="text-sm text-muted -mt-0.5">Te enviamos un link por WhatsApp con tus opciones</p>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-white" />
              </div>
              <p className="text-sm text-muted -mt-0.5">Vos elegís con quién conectar, cuando quieras</p>
            </div>
          </div>

          <div className="mt-8">
            <a
              href="/"
              className="inline-flex items-center justify-center w-full px-6 py-3.5 bg-brand text-white font-semibold rounded-full shadow-elevated hover:shadow-strong btn-press-glow transition-all"
            >
              Volver al inicio
            </a>
          </div>
        </div>

        <p className="text-xs text-muted text-center mt-6">
          Tu privacidad primero: nadie recibe tus datos hasta que vos escribas.
        </p>
      </div>
    </div>
  )
}
