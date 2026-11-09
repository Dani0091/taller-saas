import { test, expect, request as pwRequest } from '@playwright/test'
import { SIN_SESION } from './sin-sesion'

// Buscador global (Ctrl+K): órdenes, vehículos, clientes y facturas del taller
// de la sesión. Nunca devuelve datos de otro taller.

const VEHICULO_A = '00000000-0000-4000-a000-0000000e1a01' // 0000QAA
const CLIENTE_A = '00000000-0000-4000-a000-0000000c1a01'

test('API: encuentra por matrícula y nombre; el taller B no ve nada de A; sin sesión 401', async ({ request, baseURL }) => {
  const r = await request.get('/api/buscar?q=0000qaa')
  expect(r.status()).toBe(200)
  const a = await r.json()
  expect(a.vehiculos.map((v: { id: string }) => v.id)).toContain(VEHICULO_A)
  const porNombre = await (await request.get(`/api/buscar?q=${encodeURIComponent('Cliente QA Válido')}`)).json()
  expect(porNombre.clientes.map((c: { id: string }) => c.id)).toContain(CLIENTE_A)
  // Caracteres que rompían el filtro .or() de PostgREST: 200, no 500
  expect((await request.get(`/api/buscar?q=${encodeURIComponent('a,b(c)%_*')}`)).status()).toBe(200)

  const b = await pwRequest.newContext({ baseURL, storageState: 'playwright/.auth/qa-b.json' })
  const deB = await (await b.get('/api/buscar?q=0000qaa')).json()
  expect(deB.vehiculos.map((v: { id: string }) => v.id)).not.toContain(VEHICULO_A)
  const clientesB = await (await b.get(`/api/buscar?q=${encodeURIComponent('Cliente QA Válido')}`)).json()
  expect(clientesB.clientes.map((c: { id: string }) => c.id)).not.toContain(CLIENTE_A)
  await b.dispose()

  const anon = await pwRequest.newContext({ baseURL, storageState: SIN_SESION })
  expect((await anon.get('/api/buscar?q=0000qaa')).status()).toBe(401)
  await anon.dispose()
})

test('pantalla: Ctrl+K, escribir la matrícula y abrir el vehículo', async ({ page }) => {
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
  await page.keyboard.press('Control+k')
  const dialogo = page.getByRole('dialog', { name: 'Buscar en el taller' })
  await expect(dialogo).toBeVisible()
  await page.keyboard.type('0000QAA')
  await dialogo.getByRole('option', { name: /^0000QAA/ }).click()
  await expect(page).toHaveURL(/\/dashboard\/vehiculos\?q=0000QAA/)
  await expect(page.getByLabel('Buscar vehículos')).toHaveValue('0000QAA')
})
