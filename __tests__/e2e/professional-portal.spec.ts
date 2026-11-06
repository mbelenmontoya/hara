import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { supabaseAdmin } from '../../lib/supabase-admin'

// Auth and persistence are real. Only the deliberate save failure is intercepted.
test.use({ channel: 'chrome', headless: false, launchOptions: { slowMo: 120 }, trace: 'off' })
test.describe.configure({ mode: 'serial', timeout: 90000 })

const suffix = randomUUID()
const email = `hara-portal-${suffix}@example.com`
const slug = `hara-test-portal-${suffix}`
const firstPassword = `Hara-${randomUUID()}!`
const nextPassword = `Hara-${randomUUID()}!`
const photo = 'http://localhost:3000/assets/logo/isotipo.png'
const screenshots = 'test-results/professional-portal'
const originalBio = 'Perfil temporal de verificación del portal Hara. Esta cuenta se elimina al finalizar la prueba.'
let userId: string | undefined
let proId: string | undefined
let inviteHash: string
let currentPassword: string | undefined
let context: BrowserContext
let page: Page

const publicAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

async function profile() {
  const result = await supabaseAdmin.from('professionals').select('*').eq('id', proId!).single()
  expect(result.error).toBeNull()
  return result.data!
}

async function setFixture(values: Record<string, unknown>) {
  expect(proId).toBeTruthy()
  const result = await supabaseAdmin.from('professionals').update(values).eq('id', proId!)
  expect(result.error).toBeNull()
}

async function openToken(hash: string, type: 'invite' | 'recovery') {
  // A failed navigation must not print the private URL/token in the test log.
  try {
    await page.goto(`/pro/set-password?token_hash=${encodeURIComponent(hash)}&type=${type}`)
  } catch {
    throw new Error('Password link navigation failed; private URL omitted')
  }
}

async function login(password: string) {
  await context.clearCookies()
  await page.goto('/pro/login')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
}

async function saveProfile() {
  const response = page.waitForResponse(r => r.url().endsWith('/api/pro/profile') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
  expect((await response).status()).toBe(200)
  await expect(page.getByRole('status')).toContainText('Cambios guardados')
}

async function visualStates(name: string) {
  for (const width of [320, 402, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.evaluate(async () => {
      await document.fonts.ready
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    })
    await expect(page.getByRole('img', { name: 'Hara', exact: true })).toHaveCount(1)
    const back = page.getByRole('link', { name: '← Volver', exact: true })
    await expect(back).toBeVisible()
    await expect(back).toBeInViewport()
    expect((await back.boundingBox())!.y).toBeLessThan(100)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.locator('.liquid-glass')).toHaveCount(0)
    const tooSmall = await page.locator('main button, main input:not([type="checkbox"]):not(:disabled), main select, main textarea, main input[type="checkbox"] + span').evaluateAll(elements =>
      elements.filter(el => {
        const target = el.matches('span') ? el.closest('label')! : el
        const box = target.getBoundingClientRect()
        return box.width > 0 && box.height > 0 && box.height < 43.5
      }).map(el => el.getAttribute('id') || el.textContent?.slice(0, 50)),
    )
    expect(tooSmall).toEqual([])
    const lowContrast = await page.locator('main input[placeholder], main textarea[placeholder], main .almanac-label, main button[aria-pressed="true"]').evaluateAll(elements => {
      const rgb = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number)
      const luminance = (channels: number[]) => channels.map(value => {
        const normalized = value / 255
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
      }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
      return elements.flatMap(element => {
        const style = getComputedStyle(element)
        const isField = element.matches('input, textarea')
        const foreground = getComputedStyle(element, isField ? '::placeholder' : null)
        const background = rgb(style.backgroundColor === 'rgba(0, 0, 0, 0)' ? getComputedStyle(element.closest('main')!).backgroundColor : style.backgroundColor)
        const alpha = Number(foreground.opacity)
        const text = rgb(foreground.color).map((channel, index) => channel * alpha + background[index] * (1 - alpha))
        const [lighter, darker] = [luminance(text), luminance(background)].sort((a, b) => b - a)
        const ratio = (lighter + 0.05) / (darker + 0.05)
        return ratio < 4.5 ? [{ control: element.id || element.textContent?.trim().slice(0, 30), contrast: Number(ratio.toFixed(2)) }] : []
      })
    })
    expect(lowContrast).toEqual([])
    await page.screenshot({ path: `${screenshots}/${name}-${width}.png`, fullPage: true, animations: 'disabled' })
    if (name === 'profile-active') {
      await page.screenshot({ path: `${screenshots}/${name}-viewport-${width}.png`, animations: 'disabled' })
    }
  }
}

test.beforeAll(async ({ browser }) => {
  mkdirSync(screenshots, { recursive: true })
  const invite = await supabaseAdmin.auth.admin.generateLink({ type: 'invite', email })
  expect(invite.error).toBeNull()
  userId = invite.data.user!.id
  inviteHash = invite.data.properties!.hashed_token
  const role = await supabaseAdmin.auth.admin.updateUserById(userId, { app_metadata: { role: 'professional' } })
  expect(role.error).toBeNull()
  const fixture = await supabaseAdmin.from('professionals').insert({
    slug, user_id: userId, email, full_name: 'Hara Prueba Portal', status: 'active',
    whatsapp: '+5491100000000', country: 'Argentina', city: 'Buenos Aires',
    latitude: -34.6037, longitude: -58.3816, online_only: false,
    modality: ['presencial'], specialties: ['estres-ansiedad'], practices: ['reiki'],
    service_type: ['individual'], bio: originalBio, short_description: 'Perfil temporal de prueba.',
    experience_description: 'Formación temporal de prueba.', profile_image_url: photo,
    price_range_min: 10000, price_range_max: 15000, currency: 'ARS', accepting_new_clients: true,
  }).select('id').single()
  expect(fixture.error).toBeNull()
  proId = fixture.data!.id
  context = await browser.newContext({ baseURL: 'http://localhost:3000', viewport: { width: 1280, height: 900 } })
  page = await context.newPage()
  await page.bringToFront()
  // Prevent Google SDK calls only; this test keeps the fixture's known city/coordinates.
  await page.route('**/maps.googleapis.com/**', route => route.abort())
})

test.afterAll(async () => {
  try {
    await context?.close()
    if (currentPassword) {
      const session = await publicAuth.auth.signInWithPassword({ email, password: currentPassword })
      if (!session.error) expect((await publicAuth.auth.signOut({ scope: 'global' })).error).toBeNull()
    }
  } finally {
    // Browser/sign-out failures must not skip deletion of the temporary records.
    try {
      if (proId) {
        expect((await supabaseAdmin.from('professionals').delete().eq('id', proId)).error).toBeNull()
        const remaining = await supabaseAdmin.from('professionals').select('id').eq('id', proId)
        expect(remaining.error).toBeNull()
        expect(remaining.data).toEqual([])
      }
    } finally {
      if (userId) {
        expect((await supabaseAdmin.auth.admin.deleteUser(userId)).error).toBeNull()
        const missing = await supabaseAdmin.auth.admin.getUserById(userId)
        expect(missing.error?.status).toBe(404)
        expect(missing.data.user).toBeNull()
      }
    }
  }
  console.log('CLEANUP PASS: temporary profile and Auth account absent; no invitation email sent.')
})

test('TS-001: real invitation, password validation and sign-in', async () => {
  await page.goto('/pro/perfil')
  await expect(page).toHaveURL(/\/pro\/login\?redirect=/)
  await openToken(inviteHash, 'invite')
  await expect(page.getByLabel('Nueva contraseña')).toBeVisible()
  await page.getByLabel('Nueva contraseña').fill('short')
  await page.getByLabel('Repetí la contraseña').fill('short')
  await page.getByRole('button', { name: 'Guardar contraseña' }).click()
  expect(await page.getByLabel('Nueva contraseña').evaluate((el: HTMLInputElement) => el.validity.tooShort)).toBe(true)
  await page.getByLabel('Nueva contraseña').fill(firstPassword)
  await page.getByLabel('Repetí la contraseña').fill(`${firstPassword}different`)
  await page.getByRole('button', { name: 'Guardar contraseña' }).click()
  await expect(page.getByRole('main').getByRole('alert')).toContainText('no coinciden')
  await visualStates('password-invite')
  await page.getByLabel('Repetí la contraseña').fill(firstPassword)
  await page.getByRole('button', { name: 'Guardar contraseña' }).click()
  await expect(page).toHaveURL(/\/pro\/perfil$/)
  currentPassword = firstPassword
  await login(firstPassword)
  await expect(page).toHaveURL(/\/pro\/perfil$/)
})

test('TS-002: real editing, reload, public profile and optional values', async () => {
  await expect(page.getByLabel(/Email/)).toBeDisabled()
  await page.getByLabel('Nombre completo').fill('Hara Prueba Portal Editada')
  await page.getByLabel('WhatsApp').fill('+5491100000001')
  await page.getByLabel('Instagram').fill('https://instagram.com/hara.portal.prueba/')
  const score = await page.getByTestId('score-total').innerText()
  await page.getByLabel('Descripción corta').fill('Perfil temporal actualizado para comprobar la persistencia real de los datos del profesional.')
  await expect(page.getByTestId('score-total')).not.toHaveText(score)
  const bio = 'Biografía temporal actualizada. Esta descripción debe persistir después de recargar y aparecer en el perfil público.'
  await page.getByLabel('Biografía').fill(bio)
  await page.getByLabel('Experiencia').fill('Experiencia temporal actualizada para verificar el portal.')
  const online = page.getByLabel('Online', { exact: true })
  await online.check()
  await page.getByRole('button', { name: 'Meditación y mindfulness', exact: true }).click()
  await page.getByRole('button', { name: 'Autoconocimiento', exact: true }).click()
  await page.getByLabel('Precio mínimo').fill('12000')
  await page.getByLabel('Precio máximo').fill('18000')
  await page.getByLabel('Moneda').selectOption('ARS')
  await page.getByLabel('Aceptando nuevos clientes').uncheck()
  await saveProfile()
  await page.reload()
  await expect(page.getByLabel('Biografía')).toHaveValue(bio)
  await expect(page.getByLabel('Precio mínimo')).toHaveValue('12000')
  await expect(page.getByLabel('Online', { exact: true })).toBeChecked()
  await expect(page.getByRole('button', { name: 'Meditación y mindfulness', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Autoconocimiento', exact: true })).toHaveAttribute('aria-pressed', 'true')
  expect(await profile()).toMatchObject({
    full_name: 'Hara Prueba Portal Editada', email, whatsapp: '+5491100000001', instagram: 'hara.portal.prueba',
    bio, practices: ['reiki', 'meditacion-mindfulness'], specialties: ['estres-ansiedad', 'autoconocimiento'],
    modality: ['presencial', 'online'], price_range_min: 12000, price_range_max: 18000,
    service_type: ['individual'], profile_image_url: photo, accepting_new_clients: false,
    country: 'Argentina', city: 'Buenos Aires', latitude: -34.6037, longitude: -58.3816,
  })
  await page.goto(`/p/${slug}`)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Hara Prueba Portal Editada')
  await expect(page.getByText(bio, { exact: true })).toBeVisible()
  await expect(page.getByTestId('fact-price')).toContainText('12.000')
  const contact = page.getByTestId(`contact-button-${slug}`).first()
  const destination = await contact.getAttribute('href')
  expect(new URL(destination!).pathname.replace(/\D/g, '')).toBe('5491100000001')
  await expect(page.getByRole('link', { name: '@hara.portal.prueba' })).toHaveAttribute('href', 'https://www.instagram.com/hara.portal.prueba')
  await page.goto('/pro/perfil')
  await page.getByLabel('Solo atiendo online').check()
  await page.getByLabel('Precio mínimo').fill('')
  await page.getByLabel('Precio máximo').fill('')
  await saveProfile()
  await page.reload()
  await expect(page.getByLabel('Solo atiendo online')).toBeChecked()
  await expect(page.getByLabel('Ciudad o localidad')).toHaveValue('')
  await expect(page.getByLabel('Precio mínimo')).toBeEmpty()
  expect(await profile()).toMatchObject({ online_only: true, city: null, price_range_min: null, price_range_max: null, service_type: ['individual'], profile_image_url: photo })
  await visualStates('profile-active')
})

test('TS-003: simulated server failure preserves edits, real retry persists', async () => {
  await page.getByLabel('Descripción corta').fill('Este texto sobrevive al error y al reintento real.')
  await page.route('**/api/pro/profile', route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Fallo de guardado simulado.' }) }), { times: 1 })
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('Fallo de guardado simulado.')
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page.getByLabel('Descripción corta')).toHaveValue('Este texto sobrevive al error y al reintento real.')
  await visualStates('profile-save-error')
  await saveProfile()
  await page.reload()
  await expect(page.getByLabel('Descripción corta')).toHaveValue('Este texto sobrevive al error y al reintento real.')
  expect((await profile()).short_description).toBe('Este texto sobrevive al error y al reintento real.')
})

test('TS-004: real recovery changes credentials and consumed links fail', async () => {
  await context.clearCookies()
  await page.goto('/pro/set-password')
  await expect(page.getByRole('heading', { name: /Enlace inválido o vencido/ })).toBeVisible()
  await expect(page.getByRole('form')).toHaveCount(0)
  await visualStates('password-invalid')
  await openToken('not-a-real-token', 'recovery')
  await expect(page.getByRole('heading', { name: /Enlace inválido o vencido/ })).toBeVisible()
  const recovery = await supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email })
  expect(recovery.error).toBeNull()
  const hash = recovery.data.properties!.hashed_token
  await openToken(hash, 'recovery')
  await expect(page.getByRole('heading', { name: 'Elegí tu nueva contraseña' })).toBeVisible()
  await expect(page.getByLabel('Nueva contraseña')).toBeVisible()
  await visualStates('password-recovery')
  await page.getByLabel('Nueva contraseña').fill(nextPassword)
  await page.getByLabel('Repetí la contraseña').fill(nextPassword)
  await page.getByRole('button', { name: 'Guardar contraseña' }).click()
  await expect(page).toHaveURL(/\/pro\/perfil$/)
  currentPassword = nextPassword
  const oldLogin = await publicAuth.auth.signInWithPassword({ email, password: firstPassword })
  expect(oldLogin.error).not.toBeNull()
  await login(nextPassword)
  await expect(page).toHaveURL(/\/pro\/perfil$/)
  await context.clearCookies()
  await openToken(hash, 'recovery')
  await expect(page.getByRole('heading', { name: /Enlace inválido o vencido/ })).toBeVisible()
  await expect(page.getByRole('form')).toHaveCount(0)
  await login(nextPassword)
  await expect(page).toHaveURL(/\/pro\/perfil$/)
})

test('TS-005: review, rejection and missing linkage preserve restrictions', async () => {
  await setFixture({ status: 'submitted' })
  await page.reload()
  await expect(page.getByText(/Tu perfil está en revisión/)).toBeVisible()
  await expect(page.getByRole('form')).toHaveCount(0)
  const denied = await page.request.post('/api/pro/profile', { data: { full_name: 'No debe guardarse' } })
  expect(denied.status()).toBe(403)
  expect((await profile()).full_name).toBe('Hara Prueba Portal Editada')
  await visualStates('profile-pending')
  await setFixture({ status: 'rejected', rejection_reason: 'Motivo temporal para comprobar la pantalla de rechazo.' })
  await page.reload()
  await expect(page.getByText('Tu solicitud no fue aprobada.')).toBeVisible()
  await expect(page.getByText('Motivo temporal para comprobar la pantalla de rechazo.')).toBeVisible()
  await expect(page.getByRole('form')).toHaveCount(0)
  await visualStates('profile-rejected')
  await setFixture({ user_id: null })
  await page.reload()
  await expect(page.getByText('No encontramos un perfil asociado a tu cuenta.')).toBeVisible()
  await expect(page.getByRole('form')).toHaveCount(0)
  await visualStates('profile-unlinked')
})

test('TS-006: keyboard, responsive controls and real save', async () => {
  await setFixture({ user_id: userId, status: 'active', rejection_reason: null })
  await page.reload()
  await page.getByLabel('Nombre completo').focus()
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('WhatsApp')).toBeFocused()
  const practice = page.getByRole('button', { name: 'Reiki', exact: true })
  await practice.focus()
  await page.keyboard.press('Space')
  await expect(practice).toHaveAttribute('aria-pressed', 'false')
  await page.keyboard.press('Space')
  await expect(practice).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('score-panel').locator('input')).toHaveCount(0)
  await saveProfile()
  await visualStates('profile-final')
})
