// Public registration checks that do not create accounts.
import { test, expect } from '@playwright/test'
import { supabaseAdmin } from '../../lib/supabase-admin'

test.use({ channel: 'chrome', headless: false })

test('rejects tampered JSON and multipart without creating profiles or accounts', async ({ page }) => {
  const prefix = `hara-invalid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const emails = [0, 1, 2, 3].map(i => `${prefix}-${i}@example.com`)
  await page.goto('/registro')
  try {
    const results = await page.evaluate(async emails => {
      const invalid = [
        { full_name: '   ' }, { specialties: [''] },
        { bio: ' '.repeat(60) }, { modality: ['online', ''] },
      ]
      const results = []
      for (const [i, overrides] of invalid.entries()) {
        const fields = {
          full_name: 'Prueba inválida Hara', email: emails[i], password: 'Hara-validacion-2026!',
          whatsapp: '+5491112345678', country: 'AR', modality: ['online'],
          specialties: ['autoconocimiento'],
          bio: 'Acompaño procesos personales con herramientas de bienestar y autoconocimiento.',
          ...overrides,
        }
        const form = new FormData()
        for (const [key, value] of Object.entries(fields)) {
          form.set(key, Array.isArray(value) ? JSON.stringify(value) : value)
        }
        const res = await fetch('/api/professionals/register', i < 2 ? {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields),
        } : { method: 'POST', body: form })
        results.push({ status: res.status, body: await res.json() })
      }
      return results
    }, emails)
    for (const result of results) {
      expect.soft(result.status, JSON.stringify(result.body)).toBe(400)
      expect.soft(result.body.error).toEqual(expect.any(String))
    }
  } finally {
    const { data: profiles, error } = await supabaseAdmin.from('professionals')
      .select('id').in('email', emails)
    expect(error).toBeNull()
    const accounts = []
    for (let page = 1; ; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
      expect(error).toBeNull()
      accounts.push(...data.users.filter(user => emails.includes(user.email ?? '')))
      if (data.users.length < 1000) break
    }
    // Remove only this test's fixtures if a regression unexpectedly created them.
    for (const profile of profiles ?? []) {
      const { error } = await supabaseAdmin.from('professionals').delete().eq('id', profile.id)
      expect.soft(error).toBeNull()
    }
    for (const account of accounts) {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(account.id)
      expect.soft(error).toBeNull()
    }
    expect(profiles).toEqual([])
    expect(accounts).toEqual([])
  }
})

test.describe('Registration form /registro', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/registro')
    await expect(page.getByRole('heading', { name: 'Datos personales' })).toBeVisible()
  })

  test('shows four steps and disables Continue while required fields are missing', async ({ page }) => {
    await expect(page.getByRole('list', { name: 'Progreso' }).getByRole('listitem')).toHaveCount(4)
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeDisabled()
    await expect(page.getByText('Completá nombre, email, contraseña, ciudad y WhatsApp para seguir.')).toBeVisible()
  })

  test('shows the email error on blur, then clears it when corrected', async ({ page }) => {
    const email = page.getByLabel('Email', { exact: false })
    await email.fill('not-an-email')
    await email.blur()
    await expect(page.getByText('Revisá el email: parece que le falta algo.')).toBeVisible()
    await email.fill('valentina@example.com')
    await expect(page.getByText('Revisá el email: parece que le falta algo.')).not.toBeVisible()
  })

  test('checks password length and supports showing and hiding it', async ({ page }) => {
    const password = page.getByLabel('Contraseña', { exact: false })
    await password.fill('12345')
    await expect(page.getByText('La contraseña tiene que tener al menos 8 caracteres.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeDisabled()
    await page.getByRole('button', { name: 'Mostrar' }).click()
    await expect(password).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: 'Ocultar' }).click()
    await expect(password).toHaveAttribute('type', 'password')
  })

  test('offers country codes and formats the local phone number', async ({ page }) => {
    const dropdown = page.getByRole('combobox', { name: 'Código de país' })
    await expect(dropdown).toHaveValue('AR')
    await expect(dropdown.locator('option').filter({ hasText: '+54' })).toHaveCount(1)
    const phone = page.getByLabel('WhatsApp', { exact: false })
    await phone.fill('1123456789')
    await expect(phone).not.toHaveValue('')
    await phone.blur()
    await expect(phone).toHaveAttribute('aria-invalid', 'false')
  })

  test('requires selecting a city rather than only typing its name', async ({ page }) => {
    await page.getByLabel('Nombre completo', { exact: false }).fill('Valentina García')
    await page.getByLabel('Email', { exact: false }).fill('valentina@example.com')
    await page.getByLabel('Contraseña', { exact: false }).fill('clave-segura-e2e')
    await page.getByLabel('WhatsApp', { exact: false }).fill('1123456789')
    await page.getByLabel('Ubicación', { exact: false }).fill('Buenos Aires')
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeDisabled()
  })
})
