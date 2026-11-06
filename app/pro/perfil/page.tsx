// /pro/perfil — Professional self-service profile edit page
// Server component: resolves the logged-in professional by user_id,
// then renders the fully-editable ProfileEditForm client component.

import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getActivePractices } from '@/lib/practices'
import ProfileEditForm, { type EditableProfessional } from './ProfileEditForm'

export default async function ProPerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/pro/login')
  }

  const { data: pro } = await supabaseAdmin
    .from('professionals')
    .select(`id, slug, email, full_name, whatsapp, instagram, country, city, latitude, longitude,
      online_only, modality, specialties, practices, service_type, bio, short_description,
      experience_description, profile_image_url, price_range_min, price_range_max, currency,
      accepting_new_clients, status, rejection_reason`)
    .eq('user_id', user.id)
    .maybeSingle()

  const practices = pro?.status === 'active' ? await getActivePractices().catch(() => []) : []

  return (
    <main className="min-h-screen bg-background font-almanac text-foreground">
      <div className="mx-auto w-full max-w-5xl px-5 pb-12 pt-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center">
          <Link href="/" className="justify-self-start py-3 text-sm font-medium text-brand-dark focus-visible:outline-brand">
            ← Volver
          </Link>
          <Image src="/assets/logo/logoreduccion.png" alt="Hara" width={66} height={53} className="h-[38px] w-auto object-contain" priority />
          <span />
        </div>

        <div className="mb-8 mt-10">
          <p className="almanac-label mb-0 text-gray-700!">Profesionales</p>
          <h1 className="font-almanac-serif mb-0 mt-3 text-[44px] leading-[1.05]">
            Tu <em className="text-brand">perfil</em>
          </h1>
          {pro?.status === 'active' && <p className="mt-3 max-w-lg text-[15px] leading-normal text-gray-700">
            Los cambios que guardás se publican de inmediato en el directorio.
          </p>}
        </div>

        {pro?.status === 'active' ? (
          <ProfileEditForm
            professional={pro as unknown as EditableProfessional}
            practices={practices}
          />
        ) : pro ? (
          <div className="max-w-xl rounded-3xl bg-gray-50 p-6 text-[16px] leading-relaxed">
            {pro.status === 'rejected' ? (
              <>
                <p>Tu solicitud no fue aprobada.</p>
                {pro.rejection_reason && <p className="mt-3 whitespace-pre-line text-gray-700">{pro.rejection_reason}</p>}
              </>
            ) : (
              <p>Tu perfil está en revisión. Te avisamos por email cuando esté publicado.</p>
            )}
          </div>
        ) : (
          <div className="max-w-xl rounded-3xl bg-gray-50 p-6 leading-relaxed">
            <p>No encontramos un perfil asociado a tu cuenta.</p>
            <p className="mt-3 text-sm text-gray-700">
              Si creés que es un error, escribinos a{' '}
              <a href="mailto:centrovitalhara@gmail.com" className="break-words text-brand-dark underline">
                centrovitalhara@gmail.com
              </a>
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
