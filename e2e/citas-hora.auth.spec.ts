import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// La hora que el usuario elige es la que se ve después (en hora de Madrid).
test.use({ timezoneId: 'Europe/Madrid' })

const db = () =>
  createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

test('una cita creada a las 09:00 se muestra a las 09:00 y se guarda como 09:00 de Madrid', async ({ page }) => {
  const titulo = `Hora ${Date.now()}`
  await page.goto('/dashboard/citas')
  await page.getByRole('button', { name: /^día$/i }).click()
  await page.getByRole('button', { name: /^nueva cita$/i }).click()
  await page.locator('#titulo').fill(titulo)
  const inicio = await page.locator('#fecha_inicio').inputValue()
  expect(inicio).toMatch(/T09:00$/)
  await page.getByRole('button', { name: /^guardar$/i }).click()

  // En la base: el instante corresponde a las 09:00 de Madrid
  await expect.poll(async () => {
    const { data } = await db().from('citas').select('fecha_inicio').eq('titulo', titulo)
    if (!data?.length) return null
    return new Date(data[0].fecha_inicio).toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' })
  }, { timeout: 15_000 }).toBe('09:00')

  // En pantalla: la tarjeta muestra 09:00
  await page.reload()
  await page.getByRole('button', { name: /^día$/i }).click()
  const tarjeta = page.getByText(titulo).first().locator('xpath=ancestor::*[self::div or self::button][1]/..')
  await expect(tarjeta).toContainText('09:00')
})
