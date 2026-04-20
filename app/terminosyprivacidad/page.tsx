import type { Metadata } from 'next'
import { TermsAndPrivacyPage } from '@/app/components/TermsAndPrivacyPage'

export const metadata: Metadata = {
  title: 'Términos y privacidad | Hará Match',
  description: 'Información legal básica de Hará Match: términos de uso y política de privacidad en una sola página.',
}

const groups = [
  {
    id: 'terminos',
    title: 'Términos',
    intro: 'Estas condiciones explican el uso general de Hará Match para quienes buscan recomendaciones y para profesionales que quieren formar parte de la plataforma.',
    disclosures: [
      {
        title: 'Qué ofrece Hará Match',
        paragraphs: [
          'Hará Match es una plataforma que facilita el vínculo entre personas y profesionales de bienestar. Podemos mostrar perfiles, recibir solicitudes, revisar postulaciones y sugerir contactos, pero no reemplazamos el criterio profesional ni brindamos atención clínica de emergencia.',
        ],
      },
      {
        title: 'Uso esperado de la plataforma',
        paragraphs: [
          'Al usar Hará Match, aceptás utilizar la plataforma de buena fe, con información veraz y sin intentar interferir con su funcionamiento.',
        ],
        bullets: [
          'No uses datos falsos o de terceros sin autorización.',
          'No intentes acceder a áreas restringidas ni automatizar acciones no permitidas.',
          'No uses Hará Match para spam, hostigamiento o usos ilegales.',
        ],
      },
      {
        title: 'Recomendaciones y profesionales',
        paragraphs: [
          'Las recomendaciones, listados o coincidencias que aparezcan en Hará Match son una ayuda para facilitar la búsqueda. La elección final y la relación entre una persona y un profesional siempre dependen de quienes participan en ese vínculo.',
          'Cada profesional es responsable por su práctica, su disponibilidad, sus honorarios y la información que comparte en su perfil.',
        ],
      },
      {
        title: 'Altas, revisiones y suspensiones',
        paragraphs: [
          'Podemos revisar, aprobar, rechazar, pausar o remover perfiles, solicitudes o accesos cuando haga falta para cuidar la calidad del servicio, investigar problemas o prevenir usos indebidos.',
        ],
      },
      {
        title: 'Disponibilidad y cambios',
        paragraphs: [
          'Podemos actualizar, pausar o cambiar partes de Hará Match sin aviso previo si hace falta por mantenimiento, mejoras o seguridad. Hacemos lo posible por mantener la plataforma operativa, pero no garantizamos disponibilidad ininterrumpida.',
        ],
      },
      {
        title: 'Situaciones urgentes',
        paragraphs: [
          'Hará Match no está pensado para emergencias. Si estás atravesando una situación urgente o de riesgo, buscá ayuda inmediata a través de los servicios de emergencia o de salud de tu zona.',
        ],
      },
    ],
  },
  {
    id: 'privacidad',
    title: 'Privacidad',
    intro: 'Acá resumimos cómo tratamos la información que compartís con Hará Match cuando pedís recomendaciones, navegás la plataforma o te registrás como profesional.',
    disclosures: [
      {
        title: 'Qué información podemos recopilar',
        paragraphs: [
          'Cuando completás una solicitud o te registrás como profesional, podemos guardar la información que vos elegís compartir, como nombre, email, WhatsApp, ubicación, especialidades, disponibilidad y otros datos de perfil.',
          'También podemos registrar información operativa necesaria para que la plataforma funcione, como eventos de contacto, datos técnicos básicos de navegación y señales antifraude.',
        ],
      },
      {
        title: 'Para qué usamos esos datos',
        paragraphs: [
          'Usamos la información para conectar personas con profesionales de bienestar, revisar postulaciones, enviar comunicaciones relacionadas con la plataforma y mejorar la experiencia general.',
        ],
        bullets: [
          'Armar recomendaciones y administrar solicitudes.',
          'Revisar y activar perfiles profesionales.',
          'Enviar avisos operativos, confirmaciones o seguimiento.',
          'Detectar abusos, errores y usos no autorizados de la plataforma.',
        ],
      },
      {
        title: 'Cuándo compartimos información',
        paragraphs: [
          'No vendemos tu información. La compartimos solo cuando hace falta para operar Hará Match o cuando vos decidís avanzar con un contacto dentro del flujo del producto.',
        ],
        bullets: [
          'Con el equipo interno que administra solicitudes, revisiones y soporte.',
          'Con proveedores que usamos para operar la plataforma, como hosting, base de datos o envío de emails.',
          'Con profesionales, solo cuando vos decidís escribirles o cuando el flujo que pediste requiere esa intervención.',
        ],
      },
      {
        title: 'Conservación y control',
        paragraphs: [
          'Conservamos la información mientras sea útil para prestar el servicio, cumplir tareas operativas o resolver incidencias. Si querés corregir o eliminar datos que nos compartiste, podés pedirlo por los canales de contacto de la plataforma.',
        ],
      },
      {
        title: 'Seguridad y cambios',
        paragraphs: [
          'Tomamos medidas razonables para cuidar la información, pero ningún sistema es infalible. Podemos actualizar esta política si cambia el producto, el flujo de trabajo o la forma en la que operamos Hará Match.',
        ],
      },
    ],
  },
] as const

export default function TerminosYPrivacidadPage() {
  return (
    <TermsAndPrivacyPage
      updatedAt="20 de abril de 2026"
      groups={groups}
    />
  )
}
