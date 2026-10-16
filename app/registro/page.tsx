// Professional Registration — server-component shell
// Fetches the active practices catalog and passes it to the client form.
// force-dynamic: the form is user-facing and should never be statically prerendered.

export const dynamic = 'force-dynamic'

import { getActivePractices } from '@/lib/practices'
import { RegistroForm } from './RegistroForm'

export default async function ProfessionalRegistrationPage() {
  const practices = await getActivePractices()
  return <RegistroForm practices={practices} />
}
