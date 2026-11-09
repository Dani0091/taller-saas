import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// IVA 0 % (exento) en «Nueva Factura»: antes `parseFloat('0') || 21` lo
// convertía en 21 %. Ahora 0 % es una opción real y el 21 % sigue igual.

const CLIENTE_A = '00000000-0000-4000-a000-0000000c1a01'
const db = () =>
  createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

async function nuevaFactura(page: import('@playwright/test').Page, lineas: Array<{ desc: string; precio: string; iva: string }>) {
  await page.goto('/dashboard/facturas/nueva')
  await page.getByLabel('Cliente').selectOption(CLIENTE_A)
  for (const l of lineas) {
    await page.getByLabel('Descripción').fill(l.desc)
    await page.getByLabel('Precio unitario (€, sin IVA)').fill(l.precio)
    await page.getByLabel('IVA', { exact: true }).selectOption(l.iva)
    await page.getByRole('button', { name: 'Agregar Concepto' }).click()
    await expect(page.getByRole('cell', { name: l.desc })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Crear Factura' }).click()
  await page.waitForURL(/\/dashboard\/facturas\/ver\?id=/, { timeout: 30_000 })
  const id = new URL(page.url()).searchParams.get('id')!
  const { data: f } = await db().from('facturas').select('estado, numero_factura, base_imponible, iva, total, iva_porcentaje').eq('id', id).single()
  const { data: det } = await db().from('detalles_factura').select('descripcion, concepto, iva_porcentaje, iva_importe').eq('factura_id', id).order('numero_linea')
  return { factura: f!, lineas: det! }
}

test('mezcla 0 % + 21 %: cada línea con su IVA y totales correctos', async ({ page }) => {
  const sufijo = Date.now()
  const { factura, lineas } = await nuevaFactura(page, [
    { desc: `Tasa exenta QA ${sufijo}`, precio: '100', iva: '0' },
    { desc: `Mano de obra QA ${sufijo}`, precio: '50', iva: '21' },
  ])
  expect(factura.estado).toMatch(/emitida|pagada/)
  expect(factura.numero_factura).toMatch(/^[A-Z0-9]+-\d{3,}$/)
  expect(lineas.map((l) => [Number(l.iva_porcentaje), Number(l.iva_importe)])).toEqual([[0, 0], [21, 10.5]])
  expect(Number(factura.base_imponible)).toBe(150)
  expect(Number(factura.iva)).toBe(10.5)
  expect(Number(factura.total)).toBe(160.5)
  expect(Number(factura.iva_porcentaje)).toBe(21) // mezcla → el del taller, como antes
})

test('todo al 0 %: sin IVA y la cabecera dice 0 % (el PDF ya no pone "IVA (21%)")', async ({ page, request }) => {
  const { factura, lineas } = await nuevaFactura(page, [{ desc: `Exento QA ${Date.now()}`, precio: '80', iva: '0' }])
  expect(Number(lineas[0].iva_porcentaje)).toBe(0)
  expect(Number(factura.iva)).toBe(0)
  expect(Number(factura.total)).toBe(80)
  expect(Number(factura.iva_porcentaje)).toBe(0)

  const { data: f } = await db().from('facturas').select('id').eq('numero_factura', factura.numero_factura).single()
  const pdf = await (await request.get(`/api/facturas/generar-pdf?id=${f!.id}`)).json()
  expect(JSON.stringify(pdf)).toMatch(/"ivaPercentaje":0\b/)
  expect(JSON.stringify(pdf)).not.toMatch(/"ivaPercentaje":21\b/)
})

test('solo 21 %: igual que siempre', async ({ page }) => {
  const { factura, lineas } = await nuevaFactura(page, [{ desc: `Revisión QA ${Date.now()}`, precio: '100', iva: '21' }])
  expect(Number(lineas[0].iva_porcentaje)).toBe(21)
  expect(Number(factura.iva)).toBe(21)
  expect(Number(factura.total)).toBe(121)
  expect(Number(factura.iva_porcentaje)).toBe(21)
})
