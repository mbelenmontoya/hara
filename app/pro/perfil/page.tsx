// /pro/perfil — Professional self-service profile edit page
// Server component: resolves the logged-in professional by user_id,
// then renders the fully-editable ProfileEditForm client component.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getActivePractices } from '@/lib/practices'
import { PageBackground } from '@/app/components/ui/PageBackground'
import ProfileEditForm, { type EditableProfessional } from './ProfileEditForm'

export default async function ProPerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/pro/login')
  }

  const { data: pro } = await supabaseAdmin
    .from('professionals')
    .select(
      'id, slug, email, full_name, whatsapp, instagram, country, city, latitude, longitude, ' +
      'online_only, modality, specialties, practices, service_type, bio, short_description, ' +
      'experience_description, profile_image_url, price_range_min, price_range_max, currency, ' +
      'accepting_new_clients'
    )
    .eq('user_id', user.id)
    .maybeSingle()

  const practices = await getActivePractices().catch(() => [])

  return (
    <div className="min-h-screen bg-background">
      <PageBackground />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">
            Tu perfil
          </h1>
          <p className="text-sm text-muted mt-1">
            Los cambios que guardás se publican de inmediato en el directorio.
          </p>
        </div>

        {pro ? (
          <ProfileEditForm
            professional={pro as unknown as EditableProfessional}
            practices={practices}
          />
        ) : (
          <div className="text-center py-12 text-muted">
            <p>No encontramos un perfil asociado a tu cuenta.</p>
            <p className="text-sm mt-2">
              Si creés que es un error, escribinos a{' '}
              <a href="mailto:centrovitalhara@gmail.com" className="text-brand underline">
                centrovitalhara@gmail.com
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
