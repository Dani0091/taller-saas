import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

// Citas: el fin no puede ser anterior al inicio; elegir o añadir el vehículo
// desde la cita; crear la orden de trabajo con ese cliente y vehículo.
test.use({ timezoneId: 'Europe/Madrid' })

const A = '00000000-0000-4000-a000-00000000a0a1'
const CLIENTE_A = '00000000-0000-4000-a000-0000000c1a01'
const VEHICULO_A = '00000000-0000-4000-a000-0000000e1a01'
const CLIENTE_B = '00000000-0000-4000-a000-0000000c1b01'
const db = () =>
  createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

test.describe('API', () => {
  test('fin anterior al inicio → 400 al crear y al editar', async ({ request }) => {
    const mal = await request.post('/api/citas', {
      data: { titulo: 'Fin antes QA', fecha_inicio: '2026-11-09T09:00:00.000Z', fecha_fin: '2026-11-08T11:30:00.000Z' },
    })
    expect(mal.status()).toBe(400)
    expect((await mal.json()).error).toMatch(/no puede ser anterior/)

    const ok = await request.post('/api/citas', { data: { titulo: 'Fin bien QA', fecha_inicio: '2026-11-09T09:00:00.000Z' } })
    expect(ok.status()).toBe(200)
    const id = (await ok.json()).cita.id
    // Solo el fin, anterior al inicio ya guardado
    expect((await request.put(`/api/citas/${id}`, { data: { fecha_fin: '2026-11-09T08:00:00.000Z' } })).status()).toBe(400)
    // Solo el inicio, posterior al fin ya guardado (09:00 + 1 h)
    expect((await request.put(`/api/citas/${id}`, { data: { fecha_inicio: '2026-11-09T12:00:00.000Z' } })).status()).toBe(400)
    expect((await request.put(`/api/citas/${id}`, { data: { fecha_inicio: '2026-11-09T12:00:00.000Z', fecha_fin: '2026-11-09T13:00:00.000Z' } })).status()).toBe(200)
  })

  test('cliente, vehículo u orden de otro taller → 400 (antes se guardaban)', async ({ request }) => {
    const base = { titulo: 'Vínculos QA', fecha_inicio: '2026-11-09T09:00:00.000Z' }
    expect((await request.post('/api/citas', { data: { ...base, cliente_id: CLIENTE_B } })).status()).toBe(400)
    const { data: vB } = await db().from('vehiculos').select('id').eq('taller_id', '00000000-0000-4000-a000-00000000b0b1').limit(1).single()
    expect((await request.post('/api/citas', { data: { ...base, vehiculo_id: vB!.id } })).status()).toBe(400)
    expect((await request.post('/api/citas', { data: { ...base, orden_id: randomUUID() } })).status()).toBe(400)
    expect((await request.post('/api/citas', { data: { ...base, cliente_id: CLIENTE_A, vehiculo_id: VEHICULO_A } })).status()).toBe(200)
  })

  test('crear orden desde cita: una sola orden aunque se pida dos veces; 400 sin vehículo; 404 de otro taller', async ({ request }) => {
    const r = await request.post('/api/citas', {
      data: { titulo: `Orden desde cita ${Date.now()}`, descripcion: 'Ruido al frenar', fecha_inicio: '2026-11-10T08:00:00.000Z', cliente_id: CLIENTE_A, vehiculo_id: VEHICULO_A },
    })
    const cita = (await r.json()).cita
    const o1 = await request.post(`/api/citas/${cita.id}/orden`)
    expect(o1.status(), await o1.text()).toBe(201)
    const b1 = await o1.json()
    expect(b1.creada).toBe(true)
    expect(b1.orden.numero_orden).toMatch(/^OR-\d{4,}$/)
    const o2 = await request.post(`/api/citas/${cita.id}/orden`)
    expect(o2.status()).toBe(200)
    expect((await o2.json()).orden.id).toBe(b1.orden.id)

    const { data: orden } = await db().from('ordenes_reparacion').select('taller_id, cliente_id, vehiculo_id, estado, descripcion_problema').eq('id', b1.orden.id).single()
    expect(orden).toMatchObject({ taller_id: A, cliente_id: CLIENTE_A, vehiculo_id: VEHICULO_A, estado: 'recibido' })
    expect(orden!.descripcion_problema).toContain('Ruido al frenar')
    expect((await db().from('citas').select('orden_id').eq('id', cita.id).single()).data!.orden_id).toBe(b1.orden.id)

    const sinVehiculo = (await (await request.post('/api/citas', { data: { titulo: 'Sin vehículo QA', fecha_inicio: '2026-11-10T08:00:00.000Z', cliente_id: CLIENTE_A } })).json()).cita
    expect((await request.post(`/api/citas/${sinVehiculo.id}/orden`)).status()).toBe(400)

    const { data: ajena } = await db().from('citas').insert({ taller_id: '00000000-0000-4000-a000-00000000b0b1', titulo: 'Ajena', tipo: 'cita', estado: 'pendiente', fecha_inicio: '2026-11-10T08:00:00.000Z' }).select('id').single()
    expect((await request.post(`/api/citas/${ajena!.id}/orden`)).status()).toBe(404)
  })
})

test.describe('formulario', () => {
  test('cambiar el inicio mueve el fin; un fin anterior se avisa y no se guarda', async ({ page }) => {
    await page.goto('/dashboard/citas')
    await page.getByRole('button', { name: /^nueva cita$/i }).click()
    await page.locator('#titulo').fill(`Fechas ${Date.now()}`)
    await page.locator('#fecha_inicio').fill('2026-11-09T10:00')
    await page.locator('#fecha_fin').fill('2026-11-09T11:30')
    // El inicio pasa al día siguiente: el fin se mueve conservando 1 h 30
    await page.locator('#fecha_inicio').fill('2026-11-10T10:00')
    await expect(page.locator('#fecha_fin')).toHaveValue('2026-11-10T11:30')

    await page.locator('#fecha_fin').fill('2026-11-09T12:30')
    await expect(page.getByRole('alert').filter({ hasText: /no puede ser anterior/ })).toBeVisible()
    let escrituras = 0
    page.on('request', (r) => { if (r.url().includes('/api/citas') && r.method() === 'POST') escrituras++ })
    await page.getByRole('button', { name: /^guardar$/i }).click()
    await expect(page.locator('#titulo')).toBeVisible()
    expect(escrituras).toBe(0)
  })

  test('cliente sin vehículos: añadir uno desde la cita y crear la orden', async ({ page }) => {
    const sello = Date.now().toString().slice(-6)
    const clienteId = randomUUID()
    expect((await db().from('clientes').insert({ id: clienteId, taller_id: A, nombre: 'Nuria', apellidos: `SinCoche ${sello}`, telefono: '600000777' })).error).toBeNull()

    await page.goto('/dashboard/citas')
    await page.getByRole('button', { name: /^nueva cita$/i }).click()
    const titulo = `Cambio de aceite ${sello}`
    await page.locator('#titulo').fill(titulo)
    await page.locator('#cliente_id').selectOption(clienteId)
    await expect(page.getByText('Este cliente aún no tiene vehículos')).toBeVisible()

    await page.locator('#vehiculo_id').selectOption('__nuevo__')
    const matricula = `${sello.slice(-4)}QAZ`
    await page.getByLabel('Matrícula *').fill(matricula)
    await page.getByLabel('Marca').fill('Seat')
    await page.getByLabel('Modelo').fill('León')
    await expect(page.getByText(`Se guardará a nombre de Nuria SinCoche ${sello}.`)).toBeVisible()
    await page.getByRole('button', { name: 'Añadir vehículo' }).click()
    await expect(page.locator('#vehiculo_id option:checked')).toHaveText(`${matricula} · Seat León`)
    const { data: v } = await db().from('vehiculos').select('id, cliente_id').eq('taller_id', A).eq('matricula', matricula).single()
    expect(v!.cliente_id).toBe(clienteId)

    await page.getByRole('button', { name: 'Guardar y crear orden' }).click()
    await page.waitForURL(/\/dashboard\/ordenes\?orden=/)
    const ordenId = new URL(page.url()).searchParams.get('orden')!
    const { data: cita } = await db().from('citas').select('orden_id, vehiculo_id, cliente_id').eq('titulo', titulo).single()
    expect(cita).toEqual({ orden_id: ordenId, vehiculo_id: v!.id, cliente_id: clienteId })
    const { data: orden } = await db().from('ordenes_reparacion').select('numero_orden').eq('id', ordenId).single()
    // La ficha de la orden se abre sola
    await expect(page.getByText(orden!.numero_orden).first()).toBeVisible()

    // Al reabrir la cita (hoy a las 09:00), el botón lleva a esa orden
    await page.goto('/dashboard/citas')
    await page.getByRole('button', { name: /^día$/i }).click()
    await page.getByText(titulo).first().click()
    await page.getByRole('button', { name: 'Ver orden' }).click()
    await page.waitForURL(`**/dashboard/ordenes?orden=${ordenId}`)
  })

  test('elegir primero el vehículo rellena su cliente', async ({ page }) => {
    await page.goto('/dashboard/citas')
    await page.getByRole('button', { name: /^nueva cita$/i }).click()
    await page.locator('#vehiculo_id').selectOption(VEHICULO_A)
    await expect(page.locator('#cliente_id')).toHaveValue(CLIENTE_A)
  })
})
