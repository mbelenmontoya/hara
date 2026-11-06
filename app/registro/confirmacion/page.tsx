// The confirmation is shown in place by RegistroForm (design 12), with the applicant's name and email.
// This address stays so old links land on the form instead of a 404.

import { redirect } from 'next/navigation'

export default function RegistroConfirmacionPage() {
  redirect('/registro')
}
