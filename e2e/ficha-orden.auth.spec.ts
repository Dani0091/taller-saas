import { test, expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Ficha de orden desde la pantalla: fija lo que hoy guarda en la base de datos
// cada acción (asistente de alta, líneas, IVA, estado, autoguardado y «Guardar»).
// Sirve de red para partir el componente y llevar sus escrituras a la API.

const A = '00000000-0000-4000-a000-00000000a0a1'
const CLIENTE_A = '00000000-0000-4000-a000-0000000c1a01'
const db = () =>
  createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

test.describe.configure({ mode: 'serial' })

const sufijo = String(Date.now()).slice(-6)
const MATRICULA = `${sufijo}QAF`
let ordenId = ''

async function lineas(id: string) {
  const { data } = await db().from('lineas_orden').select('tipo, descripcion, cantidad, precio_unitario, importe_total').eq('orden_id', id).order('created_at')
  return data ?? []
}

async function orden(id: string) {
  const { data } = await db().from('ordenes_reparacion').select('*').eq('id', id).single()
  return data!
}

// Como en producción, la última orden del taller tiene formato OR-NNNN
// (otras pruebas crean órdenes «QA-…» por la API).
async function ultimaOrdenConFormatoOR() {
  const { data } = await db().from('ordenes_reparacion').select('numero_orden').eq('taller_id', A).like('numero_orden', 'OR-%')
  const max = Math.max(0, ...(data ?? []).map((o) => parseInt(o.numero_orden.slice(3), 10) || 0))
  const { error } = await db().from('ordenes_reparacion').insert({
    taller_id: A, numero_orden: `OR-${String(max + 1).padStart(4, '0')}`, estado: 'recibido', cliente_id: CLIENTE_A,
  })
  expect(error).toBeNull()
}

// La ficha ya no habla con Supabase desde el navegador: todo pasa por la API
const TABLAS_FICHA = /\/rest\/v1\/(ordenes_reparacion|lineas_orden|vehiculos|clientes|taller_config|series_factura)\b/
let directas: string[] = []
test.beforeEach(async ({ page }) => {
  directas = []
  page.on('request', (r) => { if (TABLAS_FICHA.test(r.url())) directas.push(`${r.method()} ${r.url()}`) })
})
test.afterEach(() => {
  expect(directas).toEqual([])
})

async function abrirFicha(page: Page, id: string) {
  await page.goto(`/dashboard/ordenes?orden=${id}`)
  await expect(page.getByText('Estado de la orden')).toBeVisible()
}

test('asistente: vehículo nuevo, cliente existente, descripción y guardar', async ({ page }) => {
  // Sin borrador previo del asistente
  await ultimaOrdenConFormatoOR()
  await page.goto('/dashboard/ordenes')
  await page.evaluate(() => localStorage.removeItem('orden_form_wizard'))
  await page.goto('/dashboard/ordenes?nueva=1')
  // Esperar a que la ficha termine de cargar (taller, clientes): antes de eso,
  // abrir el formulario de vehículo se cierra solo al llegar el taller.
  await page.waitForLoadState('networkidle')

  // Paso 1: la matrícula no existe → el formulario de vehículo nuevo la conserva
  await page.getByPlaceholder(/escribe la matrícula/i).fill(MATRICULA)
  await page.getByRole('button', { name: /crear nuevo vehículo/i }).first().click()
  await expect(page.getByPlaceholder('1234 BCD', { exact: true })).toHaveValue(MATRICULA)
  await page.getByPlaceholder('Seat').fill('Seat')
  await page.getByPlaceholder('Ibiza').fill('Ibiza')
  await page.getByRole('button', { name: /^crear vehículo$/i }).click()
  await expect(page.getByText(/vehículo creado/i)).toBeVisible()
  await page.getByRole('button', { name: /^siguiente$/i }).click()

  // Paso 2: cliente existente del taller
  await page.getByPlaceholder(/buscar cliente/i).fill('Cliente QA Válido')
  await page.getByRole('button', { name: /^Cliente QA Válido/ }).first().click()
  await page.getByRole('button', { name: /^siguiente$/i }).click()

  // Paso 3 y 4
  await page.getByPlaceholder(/ruido metálico/i).fill('Ruido al frenar QA')
  await page.getByRole('button', { name: /^siguiente$/i }).click()
  await expect(page.getByText(MATRICULA)).toBeVisible()
  await page.getByRole('button', { name: /guardar orden/i }).click()
  await expect(page.getByText(/orden creada/i)).toBeVisible()

  const { data: vehiculo } = await db().from('vehiculos').select('id, taller_id, cliente_id, marca, modelo').eq('matricula', MATRICULA).single()
  expect(vehiculo).toMatchObject({ taller_id: A, marca: 'Seat', modelo: 'Ibiza' })
  // El vehículo se crea en el paso 1, antes de elegir cliente
  expect(vehiculo!.cliente_id).toBeNull()

  const cliente = { id: CLIENTE_A }

  const { data: creada } = await db().from('ordenes_reparacion').select('id, taller_id, cliente_id, vehiculo_id, estado, numero_orden, descripcion_problema, iva_porcentaje')
    .eq('vehiculo_id', vehiculo!.id).single()
  expect(creada).toMatchObject({ taller_id: A, cliente_id: cliente!.id, estado: 'recibido', descripcion_problema: 'Ruido al frenar QA', iva_porcentaje: 21 })
  expect(creada!.numero_orden).toMatch(/^OR-\d{4,}$/)
  ordenId = creada!.id

  // Tras crear, se abre la ficha de la orden nueva
  await expect(page.getByText('Estado de la orden')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('orden_form_wizard'))).toBeNull()
})

test('líneas: añadir, rápida, cambiar precio y borrar se guardan al momento', async ({ page }) => {
  expect(ordenId).not.toBe('')
  await abrirFicha(page, ordenId)
  await page.getByRole('tab', { name: /elementos/i }).click()

  await page.getByPlaceholder('Ej.: Cambio de aceite y filtro').fill('Cambio de aceite QA')
  await page.getByRole('button', { name: /^añadir línea$/i }).click()
  await expect.poll(async () => (await lineas(ordenId)).length).toBe(1)
  const [mo] = await lineas(ordenId)
  expect(mo).toMatchObject({ tipo: 'mano_obra', descripcion: 'Cambio de aceite QA', cantidad: 1 })
  expect(Number(mo.importe_total)).toBe(Number(mo.precio_unitario))

  const rapido = page.getByText('Añadir elemento rápido').locator('..')
  await rapido.getByLabel('Descripción de la pieza').fill('Filtro QA')
  await rapido.getByPlaceholder('1', { exact: true }).fill('2')
  await rapido.getByPlaceholder('45,00').fill('10')
  await page.getByRole('button', { name: /^añadir$/i }).click()
  await expect.poll(async () => (await lineas(ordenId)).length).toBe(2)
  expect((await lineas(ordenId))[1]).toMatchObject({ tipo: 'pieza', descripcion: 'Filtro QA', cantidad: 2, precio_unitario: 10, importe_total: 20 })

  // Cambiar el precio de la pieza en la tabla
  const filaPieza = page.getByRole('row').filter({ hasText: 'Filtro QA' })
  const precio = filaPieza.getByPlaceholder('45,00')
  await precio.fill('12,5')
  await precio.blur()
  await expect.poll(async () => Number((await lineas(ordenId))[1]?.importe_total)).toBe(25)

  // Borrar la pieza
  await filaPieza.getByTitle('Eliminar línea').click()
  await expect.poll(async () => (await lineas(ordenId)).length).toBe(1)
})

test('autoguardado: estado, diagnóstico e IVA; «Guardar cambios» guarda la autorización y los totales', async ({ page }) => {
  await abrirFicha(page, ordenId)

  // Estado desde la cabecera
  const estado = page.getByText('Estado de la orden').locator('..')
  await estado.getByRole('button', { name: /recibido/i }).click()
  await estado.getByRole('option', { name: /^en diagnóstico$/i }).click()
  await expect(page.getByText('Guardado', { exact: true })).toBeVisible({ timeout: 10_000 })
  expect((await orden(ordenId)).estado).toBe('en_diagnostico')

  // Justo después del autoguardado del estado (antes se perdía si llegaba en menos de 2 s)
  await page.getByRole('tab', { name: /trabajo/i }).click()
  await page.getByPlaceholder(/pastillas delanteras/i).fill('Pastillas al 10 % QA')
  await expect.poll(async () => (await orden(ordenId)).diagnostico, { timeout: 10_000 }).toBe('Pastillas al 10 % QA')

  await page.getByRole('tab', { name: /info/i }).click()
  await page.getByText(/^Aplicar IVA/).click()
  await page.getByText('Cliente autoriza reparación').click()
  await page.getByRole('button', { name: /guardar cambios/i }).click()
  await expect.poll(async () => (await orden(ordenId)).presupuesto_aprobado_por_cliente).toBe(true)

  const o = await orden(ordenId)
  const [mo] = await lineas(ordenId)
  expect(o.iva_porcentaje).toBe(0)
  expect(Number(o.subtotal_mano_obra)).toBe(Number(mo.importe_total))
  // Antes se guardaba el IVA calculado al 21 % hasta un segundo guardado
  expect(Number(o.iva_amount)).toBe(0)
  expect(Number(o.total_con_iva)).toBe(Number(mo.importe_total))
})

test('orden facturada: la ficha queda en solo lectura', async ({ page }) => {
  await db().from('ordenes_reparacion').update({ estado: 'facturado' }).eq('id', ordenId)
  await abrirFicha(page, ordenId)
  await expect(page.getByText(/orden facturada — solo lectura/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /orden facturada \(bloqueada\)/i })).toBeDisabled()
})

test('asistente: crear un cliente nuevo en el paso 2 no quita el vehículo del paso 1', async ({ page }) => {
  const matricula = `${sufijo}QAG`
  const nombre = `Ficha QA ${sufijo}`
  await ultimaOrdenConFormatoOR()
  await page.goto('/dashboard/ordenes')
  await page.evaluate(() => localStorage.removeItem('orden_form_wizard'))
  await page.goto('/dashboard/ordenes?nueva=1')
  await page.waitForLoadState('networkidle')

  await page.getByPlaceholder(/escribe la matrícula/i).fill(matricula)
  await page.getByRole('button', { name: /crear nuevo vehículo/i }).first().click()
  await page.getByRole('button', { name: /^crear vehículo$/i }).click()
  await expect(page.getByText(/vehículo creado/i)).toBeVisible()
  await page.getByRole('button', { name: /^siguiente$/i }).click()

  await page.getByRole('heading', { name: 'Selecciona Cliente' }).click()
  await page.getByRole('button', { name: /crear nuevo cliente/i }).click()
  await page.getByPlaceholder('Ej.: Juan').fill(nombre)
  await page.getByPlaceholder('600 123 456').fill('600123456')
  await page.getByRole('button', { name: /^crear cliente$/i }).click()
  await expect(page.getByText(/cliente creado/i)).toBeVisible()
  await page.getByRole('button', { name: /^siguiente$/i }).click()

  await page.getByPlaceholder(/ruido metálico/i).fill('Cliente nuevo QA')
  await page.getByRole('button', { name: /^siguiente$/i }).click()
  // Antes: «Sin vehículo seleccionado» y la orden se guardaba sin coche
  await expect(page.getByText(matricula)).toBeVisible()
  await page.getByRole('button', { name: /guardar orden/i }).click()
  await expect(page.getByText(/orden creada/i)).toBeVisible()

  const { data: cliente } = await db().from('clientes').select('id, taller_id, telefono, estado, tipo_cliente').eq('nombre', nombre).single()
  expect(cliente).toMatchObject({ taller_id: A, telefono: '600123456', estado: 'activo', tipo_cliente: 'personal' })
  const { data: vehiculo } = await db().from('vehiculos').select('id').eq('matricula', matricula).single()
  const { data: creada } = await db().from('ordenes_reparacion').select('cliente_id, vehiculo_id').eq('cliente_id', cliente!.id).single()
  expect(creada).toMatchObject({ cliente_id: cliente!.id, vehiculo_id: vehiculo!.id })
})

test('asistente: el borrador se puede continuar (con su vehículo) o descartar', async ({ page }) => {
  await page.goto('/dashboard/ordenes')
  await page.evaluate(() => localStorage.removeItem('orden_form_wizard'))
  await page.goto('/dashboard/ordenes?nueva=1')
  await page.waitForLoadState('networkidle')
  await page.getByPlaceholder(/escribe la matrícula/i).fill('0000QAA')
  await page.getByRole('button', { name: /^0000QAA/ }).first().click()
  await page.getByRole('button', { name: /^siguiente$/i }).click()
  await expect(page.getByText('Paso 2 de 4')).toBeVisible()
  await page.waitForTimeout(800) // el borrador se guarda a los 500 ms

  // Volver a abrir el asistente: pregunta y continúa en el paso 2 con el vehículo cargado
  await page.goto('/dashboard/ordenes?nueva=1')
  await page.getByRole('button', { name: /continuar con borrador/i }).click()
  await expect(page.getByText('Paso 2 de 4')).toBeVisible()
  await page.getByRole('button', { name: /^atrás$/i }).click()
  await expect(page.getByText('0000QAA').first()).toBeVisible()

  // Empezar de nuevo lo descarta
  await page.goto('/dashboard/ordenes?nueva=1')
  await page.getByRole('button', { name: /empezar de nuevo/i }).click()
  await expect(page.getByText('Paso 1 de 4')).toBeVisible()
  expect((await page.evaluate(() => localStorage.getItem('orden_form_wizard'))) ?? '').not.toContain('0000QAA')
})

test('editar vehículo: el formulario trae sus datos y guardar no borra la matrícula', async ({ page }) => {
  // Vehículo propio para no tocar el de las demás pruebas
  const matricula = `${sufijo}QAE`
  const { data: v } = await db().from('vehiculos').insert({ taller_id: A, cliente_id: CLIENTE_A, matricula, marca: 'Seat', modelo: 'León', kilometros: 120000 }).select('id').single()
  const { data: o } = await db().from('ordenes_reparacion').insert({ taller_id: A, numero_orden: `QA-VE-${Date.now()}`, estado: 'recibido', cliente_id: CLIENTE_A, vehiculo_id: v!.id }).select('id').single()

  await abrirFicha(page, o!.id)
  await page.getByRole('button', { name: /^editar$/i }).click()
  // Antes se abría vacío y al guardar dejaba el vehículo sin matrícula ni kilómetros
  await expect(page.getByPlaceholder('Seat')).toHaveValue('Seat')
  await expect(page.getByPlaceholder('Ibiza')).toHaveValue('León')
  await page.getByPlaceholder('Ibiza').fill('León FR')
  await page.getByRole('button', { name: /^guardar$/i }).click()
  await expect.poll(async () => (await db().from('vehiculos').select('modelo').eq('id', v!.id).single()).data!.modelo).toBe('León FR')
  const { data: despues } = await db().from('vehiculos').select('matricula, marca, kilometros').eq('id', v!.id).single()
  expect(despues).toMatchObject({ matricula, marca: 'Seat', kilometros: 120000 })
})
