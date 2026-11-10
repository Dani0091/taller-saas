import { test, expect } from '@playwright/test'

// Pantallas públicas: cargan sin errores de consola ni respuestas 5xx.

const PANTALLAS = ['/auth/login', '/auth/registro', '/auth/recuperar']

for (const ruta of PANTALLAS) {
  test(`${ruta} carga sin errores`, async ({ page }) => {
    const errores: string[] = []
    page.on('pageerror', (e) => errores.push(e.message))
    page.on('response', (r) => {
      if (r.status() >= 500) errores.push(`${r.status()} ${r.url()}`)
    })

    const r = await page.goto(ruta)
    expect(r?.status()).toBe(200)
    // Registro es un asistente por pasos sin <form>: basta con un campo editable.
    await expect(page.locator('input').first()).toBeVisible()
    expect(errores).toEqual([])
  })
}

test('registro muestra el primer paso (datos del taller)', async ({ page }) => {
  await page.goto('/auth/registro')
  await expect(page.getByRole('heading', { name: 'Datos del Taller' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Siguiente' })).toBeVisible()
})

test('login tiene campos de email y contraseña', async ({ page }) => {
  await page.goto('/auth/login')
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
})

test('sin sesión, el dashboard no muestra datos de un taller', async ({ page }) => {
  await page.goto('/dashboard/ordenes')
  // O redirige a login, o la página queda sin filas: nunca datos sin sesión.
  if (!page.url().includes('/auth/login')) {
    await expect(page.locator('table tbody tr')).toHaveCount(0)
  }
})

test('el optimizador de imágenes de Next está desactivado (GHSA-2464-fhr4-w9xw)', async ({ request }) => {
  const r = await request.get('/_next/image?url=%2Ficon-192x192.png&w=64&q=75')
  expect(r.status()).toBeGreaterThanOrEqual(400)
})
