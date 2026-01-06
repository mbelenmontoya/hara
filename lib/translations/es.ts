// Spanish translations for Hará Match
// Central source of truth for all UI strings

export const ES_TRANSLATIONS = {
  // Recommendations page
  recommendations: {
    loading: 'Cargando...',
    title: 'Tus 3 opciones están listas',
    subtitle: 'Elegimos profesionales que encajan con lo que nos contaste.',
    cta: 'Ver mis 3 opciones',
    hint: 'Deslizá para comparar. Tu info se comparte recién cuando vos escribís.',
    progressLabel: (current: number, total: number) => `${current} de ${total}`,
    swipeHint: 'Deslizá para comparar',
    profileHint: 'Tocá el nombre para ver perfil',
  },

  // Error messages
  errors: {
    expired: {
      title: 'Este link venció',
      message: 'Pedí uno nuevo por email.',
    },
    loadFailed: {
      title: 'No pudimos cargar',
      message: 'Probá de nuevo.',
    },
    unexpected: {
      title: 'Algo salió mal',
      message: 'Ocurrió un error inesperado',
    },
    retry: 'Reintentar',
    tryAgain: 'Intentar de nuevo',
  },

  // Professional cards
  professional: {
    verified: 'Perfil revisado',
    online: 'Online',
    thisWeek: 'Esta semana',
    availableThisWeek: 'Turnos esta semana',
    whyRecommended: 'Por qué te la recomendamos',
    whyRecommendedLong: 'Por qué te la recomendamos:',
    viewProfile: 'Ver perfil',
    viewFullProfile: 'Ver perfil completo',
    viewDetails: 'Ver detalles',
    viewOtherOptions: 'Ver otras opciones',
  },

  // Contact/CTA
  contact: {
    openWhatsApp: 'Abrir WhatsApp',
    openingWhatsApp: 'Abriendo WhatsApp...',
    suggestedMessagePrefix: 'Si querés, podés empezar con:',
    messageTemplate: (firstName: string, specialty: string) =>
      `"Hola${firstName ? ` ${firstName}` : ''}, me recomendaron por Hará. ${
        specialty
          ? `Estoy buscando ayuda con ${specialty}. ¿Tenés un espacio esta semana?`
          : 'Estoy buscando empezar terapia. ¿Tenés disponibilidad esta semana?'
      }"`,
  },

  // Privacy
  privacy: {
    notice: 'Tu privacidad primero: nadie recibe tus datos hasta que vos escribas.',
  },

  // Rank labels
  ranks: {
    1: 'Mejor ajuste para vos',
    2: 'Muy compatible',
    3: 'Alternativa sólida',
  },

  // Specialty translations
  specialties: {
    anxiety: 'Ansiedad',
    depression: 'Depresión',
    stress: 'Estrés',
    trauma: 'Trauma',
    relationships: 'Relaciones',
  },

  // Location
  locations: {
    argentina: 'Argentina',
  },
} as const

export type Translations = typeof ES_TRANSLATIONS
