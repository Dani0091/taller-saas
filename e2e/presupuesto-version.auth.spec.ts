import { test, expect, request as pwRequest } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { SIN_SESION } from './sin-sesion'

// A10: el cliente acepta exactamente lo que vio. Si el taller cambia las
// líneas mientras el enlace está abierto, la aceptación se rechaza (409) y la
// página muestra la versión nueva. Al compartir se guarda total + versión.

const CLIENTE_A = '00000000-0000-4000-a000-0000000c1a01'
const VEHICULO_A = '00000000-0000-4000-a000-0000000e1a01'
const db = () =>
  createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

let seq = 0
async function ordenConLinea(request: import('@playwright/test').APIRequestContext) {
  seq += 1
  const r = await request.post('/api/ordenes', {
    data: { numero_orden: `QA-PV-${Date.now()}-${seq}`, cliente_id: CLIENTE_A, vehiculo_id: VEHICULO_A, estado: 'pendiente', descripcion_problema: 'Versión QA' },
  })
  expect(r.status(), await r.text()).toBe(201)
  const orden = (await r.json()).orden as { id: string }
  await añadirLinea(orden.id, 'Mano de obra QA', 50)
  return orden
}

async function añadirLinea(ordenId: string, descripcion: string, precio: number) {
  const { error } = await db().from('lineas_orden').insert({ orden_id: ordenId, tipo: 'mano_obra', descripcion, cantidad: 1, precio_unitario: precio, iva_porcentaje: 21 })
  expect(error).toBeNull()
}

const snapshot = async (ordenId: string) =>
  (await db().from('ordenes_reparacion')
    .select('estado, fecha_envio_presupuesto, presupuesto_total_compartido, presupuesto_hash_lineas')
    .eq('id', ordenId).single()).data!

test('API: compartir guarda la versión y aceptar una versión antigua da 409', async ({ request, baseURL }) => {
  const orden = await ordenConLinea(request)
  const rc = await request.post('/api/ordenes/compartir', { data: { orden_id: orden.id } })
  expect(rc.status()).toBe(200)
  const token = String((await rc.json()).url).split('/presupuesto/')[1]

  const publico = await pwRequest.newContext({ baseURL, storageState: SIN_SESION })
  const v1 = await (await publico.get(`/api/presupuesto/${token}`)).json()
  expect(v1.version).toMatch(/^[0-9a-f]{64}$/)

  // Lo guardado al compartir es lo que ve el cliente
  const s1 = await snapshot(orden.id)
  expect(s1.presupuesto_hash_lineas).toBe(v1.version)
  expect(Number(s1.presupuesto_total_compartido)).toBeCloseTo(v1.presupuesto.totales.total, 2)

  // El taller añade una línea con el enlace ya enviado
  await añadirLinea(orden.id, 'Pieza añadida QA', 30)

  const conVersionVieja = await publico.post(`/api/presupuesto/${token}`, { data: { version: v1.version } })
  expect(conVersionVieja.status()).toBe(409)
  expect((await conVersionVieja.json()).cambiado).toBe(true)
  // Sin versión (página antigua en caché) se compara con lo enviado
  expect((await publico.post(`/api/presupuesto/${token}`, { data: { firma: 'QA' } })).status()).toBe(409)
  expect((await snapshot(orden.id)).estado).toBe('pendiente')

  // Volver a compartir actualiza total y versión, pero no la fecha del primer envío
  expect((await request.post('/api/ordenes/compartir', { data: { orden_id: orden.id } })).status()).toBe(200)
  const v2 = await (await publico.get(`/api/presupuesto/${token}`)).json()
  const s2 = await snapshot(orden.id)
  expect(v2.version).not.toBe(v1.version)
  expect(s2.presupuesto_hash_lineas).toBe(v2.version)
  expect(Number(s2.presupuesto_total_compartido)).toBeGreaterThan(Number(s1.presupuesto_total_compartido))
  expect(s2.fecha_envio_presupuesto).toBe(s1.fecha_envio_presupuesto)

  const ok = await publico.post(`/api/presupuesto/${token}`, { data: { version: v2.version } })
  expect(ok.status(), await ok.text()).toBe(200)
  expect((await snapshot(orden.id)).estado).toBe('aprobado')

  // Cuerpo no-JSON → no 500
  expect((await publico.post(`/api/presupuesto/${token}`, { data: 'no es json', headers: { 'content-type': 'application/json' } })).status()).toBeLessThan(500)
  await publico.dispose()
})

test('órdenes compartidas antes de A10 (sin versión guardada) se siguen pudiendo aceptar', async ({ request, baseURL }) => {
  const orden = await ordenConLinea(request)
  const rc = await request.post('/api/ordenes/compartir', { data: { orden_id: orden.id } })
  const token = String((await rc.json()).url).split('/presupuesto/')[1]
  await db().from('ordenes_reparacion').update({ presupuesto_total_compartido: null, presupuesto_hash_lineas: null }).eq('id', orden.id)

  const publico = await pwRequest.newContext({ baseURL, storageState: SIN_SESION })
  const r = await publico.post(`/api/presupuesto/${token}`, { data: {} })
  expect(r.status(), await r.text()).toBe(200)
  await publico.dispose()
})

test('página pública: si el taller cambia el presupuesto, avisa y muestra el nuevo antes de aceptar', async ({ request, browser }) => {
  const orden = await ordenConLinea(request)
  const rc = await request.post('/api/ordenes/compartir', { data: { orden_id: orden.id } })
  const url = new URL((await rc.json()).url)

  const ctx = await browser.newContext({ storageState: SIN_SESION })
  const page = await ctx.newPage()
  await page.goto(url.pathname)
  await expect(page.getByText('Mano de obra QA')).toBeVisible()

  await añadirLinea(orden.id, 'Pieza añadida QA', 30)

  const aviso = page.waitForEvent('dialog')
  await page.getByRole('button', { name: /aceptar presupuesto/i }).click()
  const dialogo = await aviso
  expect(dialogo.message()).toMatch(/ha cambiado/i)
  await dialogo.accept()
  await expect(page.getByText('Pieza añadida QA')).toBeVisible()
  expect((await snapshot(orden.id)).estado).toBe('pendiente')

  await page.getByRole('button', { name: /aceptar presupuesto/i }).click()
  await expect(page.getByText('Presupuesto aceptado')).toBeVisible()
  expect((await snapshot(orden.id)).estado).toBe('aprobado')
  await ctx.close()
})
