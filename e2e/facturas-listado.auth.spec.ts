import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

// Listado de facturas: antes cargaba solo las 100 más recientes y filtraba en
// el navegador; las demás no se veían ni se encontraban. Ahora pagina y
// filtra en el servidor (búsqueda por número, matrícula, cliente o NIF; serie;
// estado; periodo).

const A = '00000000-0000-4000-a000-00000000a0a1'
const B = '00000000-0000-4000-a000-00000000b0b1'
const db = () =>
  createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

// Prefijo único por ejecución: aísla los datos del test de los demás
const serie = `L${Date.now().toString(36).slice(-5).toUpperCase()}`
const clienteId = randomUUID()
const nif = `Y${Date.now().toString().slice(-7)}Z`

test.beforeAll(async () => {
  expect((await db().from('clientes').insert({ id: clienteId, taller_id: A, nombre: 'Zacarías', apellidos: `Listado ${serie}`, nif })).error).toBeNull()
  expect((await db().from('series_factura').insert({ taller_id: A, nombre: `Serie ${serie}`, prefijo: serie, ultimo_numero: 30 })).error).toBeNull()
  const hoy = new Date().toISOString().slice(0, 10)
  const filas = Array.from({ length: 30 }, (_, i) => ({
    taller_id: A,
    cliente_id: i === 0 ? clienteId : '00000000-0000-4000-a000-0000000c1a01',
    numero_factura: `${serie}-${String(i + 1).padStart(3, '0')}`,
    fecha_emision: i === 29 ? '2020-01-15' : hoy, // una antigua para el periodo
    estado: i === 1 ? 'anulada' : 'emitida',
    base_imponible: 100, iva: 21, total: 121, iva_porcentaje: 21,
    matricula: i === 2 ? `9${serie.slice(-3)}XYZ` : null,
  }))
  expect((await db().from('facturas').insert(filas)).error).toBeNull()
  // Una del taller B con el mismo prefijo: nunca debe aparecer
  expect((await db().from('facturas').insert({ taller_id: B, cliente_id: '00000000-0000-4000-a000-0000000c1b01', numero_factura: `${serie}-999`, fecha_emision: hoy, estado: 'emitida', total: 1 })).error).toBeNull()
})

test.afterAll(async () => {
  await db().from('facturas').delete().like('numero_factura', `${serie}-%`)
  await db().from('series_factura').delete().eq('prefijo', serie)
  await db().from('clientes').delete().eq('id', clienteId)
})

const contador = (page: import('@playwright/test').Page) => page.getByText(/^\d+ facturas?( · mostrando \d+–\d+)?$/)

test('pagina en el servidor: 30 facturas de la serie → 25 + 5, sin las del otro taller', async ({ page }) => {
  await page.goto('/dashboard/facturas')
  await page.getByLabel('Serie').selectOption(serie)
  await expect(contador(page)).toHaveText('30 facturas · mostrando 1–25')
  await expect(page.locator('tbody tr')).toHaveCount(25)
  await expect(page.getByText(`${serie}-999`)).toHaveCount(0)

  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page.getByText('Página 2 de 2')).toBeVisible()
  await expect(contador(page)).toHaveText('30 facturas · mostrando 26–30')
  await expect(page.locator('tbody tr')).toHaveCount(5)
  await expect(page.getByRole('button', { name: 'Siguiente' })).toBeDisabled()

  // Cambiar un filtro vuelve a la página 1
  await page.getByLabel('Estado').selectOption('anulada')
  await expect(contador(page)).toHaveText('1 factura')
  await expect(page.getByText(`${serie}-002`)).toBeVisible()
})

test('búsqueda por número, matrícula escrita a mano, nombre y NIF del cliente', async ({ page }) => {
  await page.goto('/dashboard/facturas')
  const buscar = page.getByLabel('Buscar')

  await buscar.fill(`${serie}-030`)
  await expect(contador(page)).toHaveText('1 factura')

  await buscar.fill(`9${serie.slice(-3)}XYZ`)
  await expect(contador(page)).toHaveText('1 factura')
  await expect(page.getByRole('cell', { name: `9${serie.slice(-3)}XYZ` })).toBeVisible()

  await buscar.fill(`Listado ${serie}`)
  await expect(contador(page)).toHaveText('1 factura')
  await expect(page.getByText(`${serie}-001`)).toBeVisible()

  await buscar.fill(nif)
  await expect(contador(page)).toHaveText('1 factura')

  // Caracteres que antes rompían el filtro del servidor
  await buscar.fill('a,b)(c%')
  await expect(page.getByText('Ninguna factura coincide con estos filtros')).toBeVisible()
  await page.getByRole('button', { name: 'Quitar filtros' }).click()
  await expect(buscar).toHaveValue('')
})

test('periodo "Este año" deja fuera la de 2020; fecha personalizada la encuentra', async ({ page }) => {
  await page.goto('/dashboard/facturas')
  await page.getByLabel('Serie').selectOption(serie)
  await expect(contador(page)).toHaveText('30 facturas · mostrando 1–25')

  await page.getByRole('button', { name: 'Este año' }).click()
  await expect(contador(page)).toHaveText('29 facturas · mostrando 1–25')

  await page.getByRole('button', { name: 'Fecha personalizada' }).click()
  await page.getByLabel('Desde').fill('2020-01-01')
  await page.getByLabel('Hasta').fill('2020-01-31')
  await expect(contador(page)).toHaveText('1 factura')
  await expect(page.getByText(`${serie}-030`)).toBeVisible()
})

test('acciones con nombre accesible', async ({ page }) => {
  await page.goto('/dashboard/facturas')
  await page.getByLabel('Buscar').fill(`${serie}-003`)
  await expect(contador(page)).toHaveText('1 factura')
  await expect(page.getByRole('link', { name: `Ver factura ${serie}-003` })).toBeVisible()
  await expect(page.getByRole('button', { name: `Anular factura ${serie}-003` })).toBeVisible()
})
