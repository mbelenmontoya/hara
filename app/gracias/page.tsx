// Hara Vital — Post-solicitud confirmation
// Shown after successful intake form submission

import { PageBackground } from '@/app/components/ui/PageBackground'

export default function GraciasPage() {
  return (
    <div className="min-h-screen bg-background">
      <PageBackground />

      {/* Content */}
      <div className="relative z-10 container-public pt-8 pb-12">

        <h1 className="text-2xl font-semibold text-foreground mb-3 text-center">
          ¡Recibimos tu solicitud!
        </h1>

        <p className="text-muted leading-relaxed mb-8 text-center">
          Vamos a buscar profesionales que se ajusten a lo que nos contaste.
          Te escribimos cuando tengamos tus 3 opciones.
        </p>

        <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 w-full overflow-hidden p-8">

          <p className="text-sm font-semibold text-foreground mb-5">
            ¿Qué sigue?
          </p>

          <div className="flex flex-col items-start text-left">
            {/* Step 1 */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-success shrink-0 mt-0.5" />
                <div className="w-px flex-1 min-h-14 bg-white/40 mt-1" />
              </div>
              <div className="-mt-0.5 pb-4">
                <p className="text-sm font-medium text-foreground">Leemos tu solicitud</p>
                <p className="text-xs text-muted mt-1 leading-relaxed">Todo lo que nos contaste — tu situación, tus preferencias, dónde estás — nos ayuda a entender qué tipo de acompañamiento tiene más sentido para vos.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-white/50 shrink-0 mt-0.5" />
                <div className="w-px flex-1 min-h-14 bg-white/40 mt-1" />
              </div>
              <div className="-mt-0.5 pb-4">
                <p className="text-sm font-medium text-muted">Elegimos 3 opciones a mano</p>
                <p className="text-xs text-muted/70 mt-1 leading-relaxed">Alguien del equipo de Hara lee tu solicitud y elige las 3 opciones que mejor encajan. No es un algoritmo: es una persona que conoce a los profesionales.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-white/50 shrink-0 mt-0.5" />
                <div className="w-px flex-1 min-h-14 bg-white/40 mt-1" />
              </div>
              <div className="-mt-0.5 pb-4">
                <p className="text-sm font-medium text-muted">Recibís tu link con las 3 opciones</p>
                <p className="text-xs text-muted/70 mt-1 leading-relaxed">Te mandamos un link con los perfiles de tus 3 profesionales: sus especialidades, su experiencia, sus reseñas. Podés tomarte el tiempo que necesitás para comparar.</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-white/50 shrink-0 mt-0.5" />
              </div>
              <div className="-mt-0.5">
                <p className="text-sm font-medium text-muted">Vos elegís, a tu ritmo</p>
                <p className="text-xs text-muted/70 mt-1 leading-relaxed">Escribís al profesional que más te resuene, cuando estés lista/o. Tu información no se comparte hasta que vos abrís la conversación.</p>
              </div>
            </div>
          </div>

        </div>

        <p className="text-xs text-muted text-center mt-6">
          Tu privacidad primero: nadie recibe tus datos hasta que vos escribas.
        </p>
      </div>
    </div>
  )
}
