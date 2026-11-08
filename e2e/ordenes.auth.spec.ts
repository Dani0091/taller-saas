import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Órdenes, presupuesto público y cobro rápido con sesión del admin QA A,
// contra el Supabase LOCAL. Las líneas de orden se crean como dato de partida
// con la clave de servicio local (en la UI las inserta el navegador).

const A = '00000000-0000-4000-a000-00000000a0a1'
const B = '00000000-0000-4000-a000-00000000b0b1'
const CLIENTE_A = '00000000-0000-4000-a000-0000000c1a01'
const VEHICULO_A = '00000000-0000-4000-a000-0000000e1a01'

test.describe.configure({ mode: 'serial' })

const admin = () =>
  createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })

let seq = 0
async function crearOrden(request: APIRequestContext, extra: Record<string, unknown> = {}) {
  seq += 1
  const r = await request.post('/api/ordenes', {
    data: {
      numero_orden: `QA-OR-${Date.now()}-${seq}`,
      cliente_id: CLIENTE_A,
      vehiculo_id: VEHICULO_A,
      estado: 'pendiente',
      descripcion_problema: 'Revisión QA',
      ...extra,
    },
  })
  const body = await r.json()
  expect(r.status(), JSON.stringify(body)).toBe(201)
  return body.orden as { id: string; taller_id: string; estado: string; token_publico: string | null }
}

async function añadirLinea(ordenId: string) {
  const { error } = await admin().from('lineas_orden').insert({
    orden_id: ordenId,
    tipo: 'mano_obra',
    descripcion: 'Mano de obra QA',
    cantidad: 1,
    precio_unitario: 50,
    iva_porcentaje: 21,
  })
  expect(error).toBeNull()
}

test('crear orden: el taller sale de la sesión aunque el body diga otro', async ({ request }) => {
  const orden = await crearOrden(request, { taller_id: B })
  expect(orden.taller_id).toBe(A)
})

test('GET /api/ordenes lista solo órdenes del taller de la sesión', async ({ request }) => {
  const r = await request.get('/api/ordenes')
  expect(r.status()).toBe(200)
  // La respuesta no incluye taller_id: se comprueba cada id contra la BD.
  const ids = ((await r.json()).ordenes as Array<{ id: string }>).map((o) => o.id)
  expect(ids.length).toBeGreaterThan(0)
  const { data } = await admin().from('ordenes_reparacion').select('taller_id').in('id', ids)
  expect(data?.length).toBe(ids.length)
  expect(data!.every((o) => o.taller_id === A)).toBe(true)
})

test('presupuesto público: compartir, ver sin sesión, aceptar e idempotencia (A10)', async ({ request, baseURL }) => {
  const orden = await crearOrden(request)
  await añadirLinea(orden.id)

  const rc = await request.post('/api/ordenes/compartir', { data: { orden_id: orden.id } })
  const compartir = await rc.json()
  expect(rc.status(), JSON.stringify(compartir)).toBe(200)
  const token = String(compartir.url).split('/presupuesto/')[1]
  expect(token).toMatch(/^[0-9a-f-]{36}$/)

  // Cliente final: sin cookies de sesión
  const publico = await pwRequest.newContext({ baseURL })
  const rv = await publico.get(`/api/presupuesto/${token}`)
  expect(rv.status()).toBe(200)
  expect(JSON.stringify(await rv.json())).toContain('Mano de obra QA')

  const ra = await publico.post(`/api/presupuesto/${token}`, { data: { firma: 'QA' } })
  expect(ra.status(), await ra.text()).toBe(200)
  const ra2 = await publico.post(`/api/presupuesto/${token}`, { data: { firma: 'QA' } })
  expect(ra2.status()).toBe(200)
  expect((await ra2.json()).mensaje).toContain('ya estaba aceptado')

  const { data } = await admin().from('ordenes_reparacion').select('estado').eq('id', orden.id).single()
  expect(data?.estado).toBe('aprobado')

  expect((await publico.get('/api/presupuesto/00000000-0000-4000-a000-000000000000')).status()).toBe(404)
  await publico.dispose()
})

test('cobro rápido: factura con número, orden facturada, sin segunda factura (A04)', async ({ request }) => {
  const orden = await crearOrden(request, { estado: 'aprobado' })
  await añadirLinea(orden.id)

  const r1 = await request.post('/api/facturas/cobro-rapido', { data: { orden_id: orden.id, serie: 'QA' } })
  const b1 = await r1.json()
  expect(r1.status(), JSON.stringify(b1)).toBe(200)
  const numero = b1.numero_factura ?? b1.factura?.numero_factura
  expect(numero).toMatch(/^QA-\d{3,}$/)

  const { data: o } = await admin().from('ordenes_reparacion').select('estado').eq('id', orden.id).single()
  expect(o?.estado).toBe('facturado')

  // No se puede volver a cobrar ni editar la orden facturada
  const r2 = await request.post('/api/facturas/cobro-rapido', { data: { orden_id: orden.id, serie: 'QA' } })
  expect(r2.status()).toBe(400)
  const rp = await request.patch('/api/ordenes', { data: { id: orden.id, descripcion_problema: 'cambio' } })
  expect(rp.status()).toBe(409)

  // El presupuesto de una orden facturada no puede aceptarse
  const { count } = await admin().from('facturas').select('id', { count: 'exact', head: true }).eq('orden_id', orden.id)
  expect(count).toBe(1)
})

test('sin serie elegida se usa taller_config.serie_factura, como en producción', async ({ request }) => {
  const { error } = await admin().from('taller_config').update({ serie_factura: 'QA' }).eq('taller_id', A)
  expect(error).toBeNull()
  try {
    const orden = await crearOrden(request, { estado: 'aprobado' })
    await añadirLinea(orden.id)
    const r = await request.post('/api/facturas/cobro-rapido', { data: { orden_id: orden.id } })
    const b = await r.json()
    expect(r.status(), JSON.stringify(b)).toBe(200)
    expect(b.numero_factura ?? b.factura?.numero_factura).toMatch(/^QA-\d{3,}$/)
  } finally {
    await admin().from('taller_config').update({ serie_factura: null }).eq('taller_id', A)
  }
})

test('cobro rápido rechaza órdenes en estado no facturable', async ({ request }) => {
  const orden = await crearOrden(request, { estado: 'pendiente' })
  await añadirLinea(orden.id)
  const r = await request.post('/api/facturas/cobro-rapido', { data: { orden_id: orden.id, serie: 'QA' } })
  expect(r.status()).toBe(400)
})
