import { test, expect, type APIRequestContext } from '@playwright/test'

// Flujos con sesión del admin del taller QA A contra el Supabase LOCAL
// (esquema del laboratorio + seed ficticio de supabase/local/10_seed_qa.sql).

const A = '00000000-0000-4000-a000-00000000a0a1'
const B = '00000000-0000-4000-a000-00000000b0b1'
const CLIENTE_A = '00000000-0000-4000-a000-0000000c1a01'
const CLIENTE_B = '00000000-0000-4000-a000-0000000c1b01'

test.describe.configure({ mode: 'serial' })

async function crearBorrador(request: APIRequestContext, serie: string) {
  const r = await request.post('/api/facturas/crear', {
    data: {
      taller_id: A,
      cliente_id: CLIENTE_A,
      serie,
      fecha_emision: new Date().toISOString().slice(0, 10),
      base_imponible: 100,
      iva: 21,
      total: 121,
      metodo_pago: 'efectivo',
      lineas: [{ descripcion: 'Mano de obra QA', cantidad: 1, precio_unitario: 100, iva_porcentaje: 21 }],
    },
  })
  expect(r.status(), await r.text()).toBeLessThan(300)
  const body = await r.json()
  const id = body.factura?.id ?? body.id ?? body.data?.id
  expect(id, JSON.stringify(body)).toBeTruthy()
  return id as string
}

async function emitir(request: APIRequestContext, facturaId: string) {
  const r = await request.post('/api/facturas/emitir', { data: { factura_id: facturaId, estado_final: 'emitida' } })
  const body = await r.json()
  expect(r.status(), JSON.stringify(body)).toBe(200)
  return (body.numero_factura ?? body.factura?.numero_factura) as string
}

test('el dashboard carga sin errores', async ({ page }) => {
  const errores: string[] = []
  page.on('pageerror', (e) => errores.push(e.message))
  page.on('response', (r) => { if (r.status() >= 500) errores.push(`${r.status()} ${r.url()}`) })
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/dashboard/)
  await page.waitForLoadState('networkidle')
  expect(errores).toEqual([])
})

test('SEC-01: /api/clientes solo devuelve clientes del taller de la sesión', async ({ request }) => {
  const r = await request.get(`/api/clientes?taller_id=${B}`) // el parámetro debe ignorarse
  expect(r.status()).toBe(200)
  const ids = (await r.json()).map((c: { id: string }) => c.id)
  expect(ids).toContain(CLIENTE_A)
  expect(ids).not.toContain(CLIENTE_B)
})

test('CLI-01: el NIF histórico se muestra tal cual, no como 00000000T', async ({ page }) => {
  await page.goto('/dashboard/clientes')
  await expect(page.getByText('Cliente QA NIF histórico').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('0000XXX').first()).toBeVisible()
  await expect(page.getByText('00000000T')).toHaveCount(0)
})

test('aislamiento: no se puede crear una factura en el taller B', async ({ request }) => {
  const r = await request.post('/api/facturas/crear', {
    data: { taller_id: B, cliente_id: CLIENTE_B, serie: 'QB', base_imponible: 1, iva: 0, total: 1, lineas: [] },
  })
  expect(r.status(), await r.text()).toBeGreaterThanOrEqual(400)
})

test('numeración: emisiones consecutivas en formato de producción PREFIJO-NNN', async ({ request }) => {
  const n1 = await emitir(request, await crearBorrador(request, 'QA'))
  const n2 = await emitir(request, await crearBorrador(request, 'QA'))
  expect(n1).toMatch(/^QA-\d{3,}$/)
  expect(Number(n2.split('-')[1])).toBe(Number(n1.split('-')[1]) + 1)
})

test('NUM-01: la serie pasa de 999 a 1000 sin truncar ni repetir', async ({ request }) => {
  const n999 = await emitir(request, await crearBorrador(request, 'QAF'))
  const n1000 = await emitir(request, await crearBorrador(request, 'QAF'))
  expect(n999).toBe('QAF-999')
  expect(n1000).toBe('QAF-1000')
})

test('A05: emitir dos veces el mismo borrador no asigna dos números', async ({ request }) => {
  const id = await crearBorrador(request, 'QA')
  const [r1, r2] = await Promise.all([
    request.post('/api/facturas/emitir', { data: { factura_id: id, estado_final: 'emitida' } }),
    request.post('/api/facturas/emitir', { data: { factura_id: id, estado_final: 'emitida' } }),
  ])
  const ok = [r1, r2].filter((r) => r.status() === 200)
  expect(ok.length).toBeGreaterThanOrEqual(1)
  const numeros = new Set(await Promise.all(ok.map(async (r) => (await r.json()).numero_factura)))
  expect(numeros.size).toBe(1)
})
