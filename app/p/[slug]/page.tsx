// Hará Match - Professional Profile Page
// Purpose: Public profile view for professionals
// Security: Public read via service role, minimal data exposure

import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ContactButton } from '@/app/components/ContactButton'

interface Professional {
  slug: string
  name: string
  specialty: string
  bio: string | null
  whatsapp: string
  profile_image_url: string | null
  status: string
}

async function getProfessional(slug: string): Promise<Professional | null> {
  const { data, error } = await supabaseAdmin
    .from('professionals')
    .select('slug, full_name, specialty, bio, whatsapp, profile_image_url, status')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (error || !data) return null

  // Transform full_name to name for UI
  return {
    slug: data.slug,
    name: data.full_name,
    specialty: data.specialty,
    bio: data.bio,
    whatsapp: data.whatsapp,
    profile_image_url: data.profile_image_url,
    status: data.status,
  }
}

export default async function ProfessionalProfilePage({
  params,
}: {
  params: { slug: string }
}) {
  const professional = await getProfessional(params.slug)

  if (!professional) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4" data-testid="professional-profile">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="flex items-start gap-6 mb-6">
          <div className="flex-shrink-0">
            {professional.profile_image_url ? (
              <img
                src={professional.profile_image_url}
                alt={professional.name}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-2xl font-bold">
                {professional.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="flex-grow">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{professional.name}</h1>
            <p className="text-xl text-gray-600 mb-4">{professional.specialty}</p>

            {professional.bio && (
              <p className="text-gray-700 mb-6">{professional.bio}</p>
            )}

            <ContactButton
              professionalSlug={professional.slug}
              professionalName={professional.name}
              whatsappNumber={professional.whatsapp}
              trackingCode="direct-profile-visit"
              rank={0}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
