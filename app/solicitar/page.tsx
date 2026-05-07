// Concierge intake form — server-component shell.
// Fetches the active practices catalog and passes it to the client form.
// force-dynamic: this is a user-facing form; never statically prerendered.

export const dynamic = 'force-dynamic'

import { getActivePractices } from '@/lib/practices'
import { SolicitarForm } from './SolicitarForm'

export default async function SolicitarPage() {
  const practices = await getActivePractices()
  return <SolicitarForm practices={practices} />
}
