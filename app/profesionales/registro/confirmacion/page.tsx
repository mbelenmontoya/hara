// Professional Registration Confirmation Page
// Shown after successful form submission

export default function ConfirmationPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundColor: '#FBF7F2',
          backgroundImage: 'url(/assets/illustrations/rizki-kurniawan-SSp6eC-LKBU-unsplash.svg)',
          backgroundSize: 'cover',
          backgroundPosition: 'bottom',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Content - aligned to top */}
      <div className="relative z-10 min-h-screen flex flex-col items-center pt-12 px-4">
        {/* Title and description outside the card */}
        <h1 className="text-2xl font-semibold text-foreground mb-3 text-center">
          ¡Solicitud enviada!
        </h1>
        
        <p className="text-muted leading-relaxed mb-8 text-center max-w-sm">
          Recibimos tu información. Nuestro equipo revisará tu perfil y te contactaremos 
          por email en las próximas 24-48 horas.
        </p>

        {/* Card with timeline and button */}
        <div className="liquid-glass rounded-3xl shadow-elevated border border-outline/30 w-full max-w-md overflow-hidden p-8">
          {/* Steps timeline */}
          <div className="mb-8">
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
                <p className="text-sm text-foreground -mt-0.5">Revisamos tu perfil</p>
              </div>
              
              {/* Step 2 */}
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                  <div className="w-px h-8 bg-white" />
                </div>
                <p className="text-sm text-muted -mt-0.5">Te enviamos un email de confirmación</p>
              </div>
              
              {/* Step 3 */}
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                </div>
                <p className="text-sm text-muted -mt-0.5">Tu perfil se activa y empezás a recibir leads</p>
              </div>
            </div>
          </div>

          <a
            href="/"
            className="inline-flex items-center justify-center w-full px-6 py-3.5 bg-brand text-white font-semibold rounded-full shadow-elevated hover:shadow-strong btn-press-glow transition-all"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  )
}
