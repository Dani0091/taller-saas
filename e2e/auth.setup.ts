import { test as setup, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

// Crea (o reutiliza) los admins de los talleres QA A/B en el Supabase LOCAL y
// guarda su sesión. Mismo flujo que el alta real: auth.users → trigger
// on_auth_user_created → public.usuarios (sin taller, operario) → se asigna
// taller y rol. La contraseña es aleatoria por ejecución y no se escribe en disco.

export const QA = {
  a: { email: 'qa-a-admin@example.test', tallerId: '00000000-0000-4000-a000-00000000a0a1', state: 'playwright/.auth/qa-a.json' },
  b: { email: 'qa-b-admin@example.test', tallerId: '00000000-0000-4000-a000-00000000b0b1', state: 'playwright/.auth/qa-b.json' },
} as const

const url = process.env.E2E_SUPABASE_URL ?? ''
const serviceKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ?? ''

for (const [clave, qa] of Object.entries(QA)) {
  setup(`sesión QA ${clave.toUpperCase()}`, async ({ page }) => {
    expect(new URL(url).hostname, 'solo Supabase local').toMatch(/^(127\.0\.0\.1|localhost)$/)
    expect(serviceKey, 'falta E2E_SUPABASE_SERVICE_ROLE_KEY (source scripts/e2e-env.sh)').not.toBe('')

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
    const password = randomBytes(24).toString('base64url')

    const { data: lista } = await admin.auth.admin.listUsers()
    const existente = lista.users.find((u) => u.email === qa.email)
    if (existente) {
      const { error } = await admin.auth.admin.updateUserById(existente.id, { password })
      expect(error).toBeNull()
    } else {
      const { error } = await admin.auth.admin.createUser({ email: qa.email, password, email_confirm: true })
      expect(error).toBeNull()
    }

    const { error: errPerfil } = await admin
      .from('usuarios')
      .update({ taller_id: qa.tallerId, rol: 'admin', nombre: `Admin QA ${clave.toUpperCase()}` })
      .eq('email', qa.email)
    expect(errPerfil).toBeNull()

    // Diagnóstico: si el login falla, el motivo aparece en la salida del test.
    page.on('console', (m) => { if (m.type() === 'error') console.log(`[navegador] ${m.text()}`) })
    page.on('requestfailed', (r) => console.log(`[red] ${r.url()} → ${r.failure()?.errorText}`))
    page.on('response', (r) => { if (r.url().includes('/auth/v1/')) console.log(`[auth] ${r.status()} ${r.url().split('?')[0]}`) })

    // En next dev el formulario se reinicia si se rellena antes de la hidratación.
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    const email = page.locator('input[type="email"]')
    const pass = page.locator('input[type="password"]')
    await email.fill(qa.email)
    await pass.fill(password)
    await expect(email).toHaveValue(qa.email)
    await expect(pass).toHaveValue(password)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/dashboard**', { timeout: 60_000 })
    await page.context().storageState({ path: qa.state })
  })
}
