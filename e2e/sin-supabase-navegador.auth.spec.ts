import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Ninguna pantalla del panel lee ni escribe tablas de Supabase desde el
// navegador: todo pasa por la API (taller de la sesión, validación). Solo
// queda la sesión de Supabase Auth (/auth/v1), que no son datos del taller.

const A = '00000000-0000-4000-a000-00000000a0a1'
const db = () =>
  createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

test('las pantallas que leían de Supabase en el navegador ya usan la API', async ({ page }) => {
  const directas: string[] = []
  page.on('request', (r) => { if (r.url().includes('/rest/v1/')) directas.push(`${r.method()} ${new URL(r.url()).pathname}`) })

  const { data: factura } = await db().from('facturas').select('id').eq('taller_id', A).limit(1).single()
  const { data: orden } = await db().from('ordenes_reparacion').select('id').eq('taller_id', A).not('cliente_id', 'is', null).limit(1).single()

  const pantallas: Array<[string, RegExp | string]> = [
    ['/dashboard', /inicio/i],
    ['/dashboard/clientes/nuevo', /nuevo cliente/i],
    ['/dashboard/facturas/nueva', /nueva factura/i],
    [`/dashboard/facturas/ver?id=${factura!.id}`, /factura/i],
    ['/dashboard/configuracion', /configuraci/i],
    [`/dashboard/ordenes?orden=${orden!.id}`, 'Estado de la orden'],
    ['/dashboard/ordenes?nueva=1', 'Selecciona Vehículo'],
  ]
  for (const [ruta, texto] of pantallas) {
    await page.goto(ruta)
    await expect(page.getByText(texto).first()).toBeVisible()
    await page.waitForLoadState('networkidle')
  }
  expect(directas).toEqual([])
})

test('nuevo cliente sigue guardándose en el taller de la sesión', async ({ page }) => {
  const nombre = `Sin Supabase QA ${Date.now()}`
  await page.goto('/dashboard/clientes/nuevo')
  await page.waitForLoadState('networkidle')
  await page.getByLabel(/nombre/i).first().fill(nombre)
  await page.getByRole('button', { name: /guardar|crear/i }).last().click()
  await expect.poll(async () => (await db().from('clientes').select('taller_id').eq('nombre', nombre).maybeSingle()).data?.taller_id).toBe(A)
})
