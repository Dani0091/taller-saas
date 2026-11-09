import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Caminos de usuario por la interfaz: rellenar formularios como una persona y
// comprobar en la base local que el resultado existe. El recorrido de botones
// no rellena formularios, así que estos caminos se prueban aquí.

const A = '00000000-0000-4000-a000-00000000a0a1'

const db = () =>
  createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

test('nuevo cliente desde la pantalla: se guarda y vuelve al listado', async ({ page }) => {
  const nombre = `Cliente UI ${Date.now()}`
  await page.goto('/dashboard/clientes/nuevo')
  await page.waitForLoadState('networkidle')
  await page.locator('#nombre').fill(nombre)
  await page.locator('#nif').fill('12345678Z')
  await page.getByRole('button', { name: /crear cliente/i }).click()

  await expect(page).toHaveURL(/\/dashboard\/clientes$/, { timeout: 15_000 })
  const { data } = await db().from('clientes').select('id, taller_id').eq('nombre', nombre)
  expect(data?.length).toBe(1)
  expect(data![0].taller_id).toBe(A)
})

test('formulario de cita: el selector muestra los clientes del taller', async ({ page }) => {
  await page.goto('/dashboard/citas')
  await page.waitForLoadState('networkidle')
  // La vista Día muestra siempre el botón "Nueva" (en vista Mes hay que elegir un día).
  await page.getByRole('button', { name: /^día$/i }).click()
  await page.getByRole('button', { name: /^nueva cita$/i }).click()
  const selector = page.locator('#cliente_id')
  await expect(selector).toBeVisible({ timeout: 10_000 })
  // La etiqueta incluye el teléfono, para distinguir clientes con el mismo nombre
  await expect(selector.locator('option', { hasText: 'Cliente QA Válido' })).toHaveText('Cliente QA Válido (600000001)')
  // Al elegir cliente, el selector de vehículos muestra los suyos
  await selector.selectOption('00000000-0000-4000-a000-0000000c1a01')
  await expect(page.locator('#vehiculo_id option', { hasText: '0000QAA' })).toHaveCount(1)
})

test('cita completa: se guarda con cliente y vehículo del taller', async ({ page }) => {
  const titulo = `Revisión UI ${Date.now()}`
  await page.goto('/dashboard/citas')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /^día$/i }).click()
  await page.getByRole('button', { name: /^nueva cita$/i }).click()
  await page.locator('#titulo').fill(titulo)
  await page.locator('#cliente_id').selectOption('00000000-0000-4000-a000-0000000c1a01')
  await page.locator('#vehiculo_id').selectOption({ index: 1 })
  await page.getByRole('button', { name: /^guardar$/i }).click()

  await expect.poll(async () => {
    const { data } = await db().from('citas').select('taller_id, cliente_id, vehiculo_id').eq('titulo', titulo)
    return data
  }, { timeout: 15_000 }).toEqual([{
    taller_id: A,
    cliente_id: '00000000-0000-4000-a000-0000000c1a01',
    vehiculo_id: '00000000-0000-4000-a000-0000000e1a01',
  }])
})

test('alta de vehículo: asistente de 5 pasos hasta guardar', async ({ page }) => {
  const matricula = `9${String(Date.now()).slice(-3)}QAZ`
  await page.goto('/dashboard/vehiculos/nuevo')
  await page.waitForLoadState('networkidle')
  const siguiente = page.getByRole('button', { name: /siguiente/i })
  await page.getByLabel('Matrícula *').fill(matricula)
  await siguiente.click()
  await page.getByLabel('Bastidor (VIN) *').fill('WVWZZZ1KZBW123456')
  await siguiente.click()
  await page.getByLabel('Marca *').fill('Seat')
  await page.getByLabel('Modelo *').fill('León')
  await siguiente.click()
  await siguiente.click()
  await page.getByRole('button', { name: /crear vehículo/i }).click()

  await expect.poll(async () => {
    const { data } = await db().from('vehiculos').select('taller_id, marca, modelo').eq('matricula', matricula)
    return data
  }, { timeout: 15_000 }).toEqual([{ taller_id: A, marca: 'Seat', modelo: 'León' }])
})

test('cabecera con el título de cada sección y versión real en el menú', async ({ page }) => {
  const casos: Array<[string, string]> = [
    ['/dashboard/citas', 'Citas'],
    ['/dashboard/clientes/nuevo', 'Nuevo cliente'],
    ['/dashboard/facturas/rapida', 'Factura rápida'],
    ['/dashboard/vehiculos/nuevo', 'Nuevo vehículo'],
  ]
  for (const [ruta, titulo] of casos) {
    await page.goto(ruta)
    await expect(page.locator('header h2'), ruta).toHaveText(titulo)
  }
  const version = (await import('../package.json', { with: { type: 'json' } })).default.version
  // El menú móvil (oculto en escritorio) también la contiene: debe verse una vez.
  await expect(page.getByText(`TallerAgil v${version}`).filter({ visible: true })).toHaveCount(1)
})

test('una cita con horario sin hora de fin no impide cargar el calendario', async ({ page }) => {
  // Dato incompleto como los que puede haber en producción (insertado directo en BD).
  const titulo = `Sin fin ${Date.now()}`
  const inicio = new Date()
  inicio.setHours(10, 0, 0, 0)
  const { error } = await db().from('citas').insert({
    taller_id: A, titulo, tipo: 'cita', estado: 'pendiente',
    fecha_inicio: inicio.toISOString(), fecha_fin: null, todo_el_dia: false,
  })
  expect(error).toBeNull()

  await page.goto('/dashboard/citas')
  await page.getByRole('button', { name: /^día$/i }).click()
  await expect(page.getByText('Error al cargar citas')).toHaveCount(0)
  await expect(page.getByText(titulo).first()).toBeVisible({ timeout: 10_000 })
})

test('al guardar una cita sin hora de fin se guarda con 1 hora de duración', async ({ page }) => {
  const titulo = `Una hora ${Date.now()}`
  await page.goto('/dashboard/citas')
  await page.getByRole('button', { name: /^día$/i }).click()
  await page.getByRole('button', { name: /^nueva cita$/i }).click()
  await page.locator('#titulo').fill(titulo)
  await page.getByRole('button', { name: /^guardar$/i }).click()

  await expect.poll(async () => {
    const { data } = await db().from('citas').select('fecha_inicio, fecha_fin').eq('titulo', titulo)
    if (!data?.length || !data[0].fecha_fin) return null
    return new Date(data[0].fecha_fin).getTime() - new Date(data[0].fecha_inicio).getTime()
  }, { timeout: 15_000 }).toBe(60 * 60 * 1000)
})

test('una cita con fin igual al inicio tampoco impide cargar el calendario', async ({ page }) => {
  const titulo = `Fin igual ${Date.now()}`
  const inicio = new Date()
  inicio.setHours(11, 0, 0, 0)
  const { error } = await db().from('citas').insert({
    taller_id: A, titulo, tipo: 'cita', estado: 'pendiente',
    fecha_inicio: inicio.toISOString(), fecha_fin: inicio.toISOString(), todo_el_dia: false,
  })
  expect(error).toBeNull()

  await page.goto('/dashboard/citas')
  await page.getByRole('button', { name: /^día$/i }).click()
  await expect(page.getByText('Error al cargar citas')).toHaveCount(0)
  await expect(page.getByText(titulo).first()).toBeVisible({ timeout: 10_000 })
})
