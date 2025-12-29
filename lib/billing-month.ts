// Hará Match - Billing Month Normalization
// Accepts: YYYY-MM or YYYY-MM-DD
// Returns: YYYY-MM-01 (first day of month)
// No Date parsing (strict string validation)

export function normalizeBillingMonth(input: string): string {
  const match = input.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/)

  if (!match) {
    throw new Error('Invalid billing_month format. Use YYYY-MM or YYYY-MM-DD')
  }

  const [, year, month] = match

  // Validate month range
  const monthNum = parseInt(month, 10)
  if (monthNum < 1 || monthNum > 12) {
    throw new Error('Month must be 01-12')
  }

  return `${year}-${month}-01`
}
