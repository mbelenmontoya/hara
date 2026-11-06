// Public registration checks that do not create accounts.
import { test, expect } from '@playwright/test'

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
