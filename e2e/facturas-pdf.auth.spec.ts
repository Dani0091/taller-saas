import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// El PDF de factura se genera en el navegador con @react-pdf, que ahora se
// carga al pulsar el botón (no al abrir la página). Se comprueba que sigue
// saliendo un PDF válido con el número de la factura en el nombre.

const CLIENTE_A = '00000000-0000-4000-a000-0000000c1a01'
const VEHICULO_A = '00000000-0000-4000-a000-0000000e1a01'
const db = () =>
  createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

test('descargar el PDF de una factura produce un PDF válido', async ({ page, request }) => {
  const r = await request.post('/api/ordenes', {
    data: { numero_orden: `QA-PDF-${Date.now()}`, cliente_id: CLIENTE_A, vehiculo_id: VEHICULO_A, estado: 'finalizado', descripcion_problema: 'PDF QA' },
  })
  expect(r.status(), await r.text()).toBe(201)
  const orden = (await r.json()).orden as { id: string }
  await db().from('lineas_orden').insert({ orden_id: orden.id, tipo: 'mano_obra', descripcion: 'Mano de obra QA', cantidad: 1, precio_unitario: 50, iva_porcentaje: 21 })
  const cobro = await request.post('/api/facturas/cobro-rapido', { data: { orden_id: orden.id, serie: 'QA' } })
  expect(cobro.status(), await cobro.text()).toBeLessThan(300)
  const { data: factura } = await db().from('facturas').select('id, numero_factura').eq('orden_id', orden.id).single()

  // La página no descarga @react-pdf hasta que se pide el PDF
  const chunks: string[] = []
  page.on('response', (res) => { if (res.url().includes('/_next/static/chunks/')) chunks.push(res.url()) })
  await page.goto(`/dashboard/facturas/ver?id=${factura!.id}`)
  await expect(page.getByRole('button', { name: /descargar pdf/i })).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(chunks.length).toBeGreaterThan(0)
  const conReactPdf: string[] = []
  for (const url of chunks) if ((await (await request.get(url)).text()).includes('@react-pdf')) conReactPdf.push(url)
  expect(conReactPdf, 'chunks con @react-pdf cargados al abrir la página').toEqual([])

  const [descarga] = await Promise.all([
    page.waitForEvent('download', { timeout: 30_000 }),
    page.getByRole('button', { name: /descargar pdf/i }).click(),
  ])
  expect(descarga.suggestedFilename()).toBe(`Factura_${factura!.numero_factura}.pdf`)
  const ruta = await descarga.path()
  const { readFileSync } = await import('node:fs')
  const contenido = readFileSync(ruta!)
  expect(contenido.subarray(0, 5).toString()).toBe('%PDF-')
  expect(contenido.length).toBeGreaterThan(2_000)
})
