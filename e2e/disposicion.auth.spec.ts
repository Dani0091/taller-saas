import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { buscarDesbordes } from './desbordes'

// Ninguna pantalla se descuadra en móvil, tablet ni escritorio: nada se sale
// de su tarjeta o de la pantalla, las tablas no esconden columnas tras un
// scroll lateral, los campos de una fila van alineados y los botones no se
// pisan. Un cliente con nombre muy largo fuerza los casos difíciles (antes
// empujaba fuera el botón «Nuevo» de «Nueva factura» y los botones de la
// lista de clientes en móvil).

const A = '00000000-0000-4000-a000-00000000a0a1'
const db = () =>
  createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

const clienteId = randomUUID()
const sello = Date.now()
let ordenId = ''
let vehiculoId = ''
let facturaId = ''

test.beforeAll(async () => {
  expect((await db().from('clientes').insert({
    id: clienteId, taller_id: A,
    nombre: 'Cliente QA Disposición con un nombre comercial larguísimo de flota de renting y alquiler sin conductor S.L.U.',
    nif: `B${String(sello).slice(-8)}`,
  })).error).toBeNull()
  const v = await db().from('vehiculos')
    .insert({ taller_id: A, cliente_id: clienteId, matricula: `QD${String(sello).slice(-5)}`, marca: 'Mercedes-Benz', modelo: 'Sprinter 316 CDI Furgón Medio Techo Elevado' }).select('id').single()
  expect(v.error).toBeNull()
  vehiculoId = v.data!.id
  const o = await db().from('ordenes_reparacion')
    .insert({ taller_id: A, numero_orden: `QA-DISP-${sello}`, estado: 'recibido', cliente_id: clienteId, vehiculo_id: vehiculoId }).select('id').single()
  expect(o.error).toBeNull()
  ordenId = o.data!.id
  const f = await db().from('facturas').insert({
    taller_id: A, cliente_id: clienteId, numero_factura: `QADISP-${String(sello).slice(-6)}`,
    fecha_emision: new Date().toISOString().slice(0, 10), estado: 'emitida',
    base_imponible: 1143.76, iva: 240.19, total: 1383.95, iva_porcentaje: 21,
  }).select('id').single()
  expect(f.error).toBeNull()
  facturaId = f.data!.id
})

test.afterAll(async () => {
  await db().from('facturas').delete().eq('id', facturaId)
  await db().from('ordenes_reparacion').delete().eq('id', ordenId)
  await db().from('vehiculos').delete().eq('id', vehiculoId)
  await db().from('clientes').delete().eq('id', clienteId)
})

const PANTALLAS: Array<[string, () => string]> = [
  ['Inicio', () => '/dashboard'],
  ['Citas', () => '/dashboard/citas'],
  ['Clientes', () => '/dashboard/clientes'],
  ['Nuevo cliente', () => '/dashboard/clientes/nuevo'],
  ['Configuración', () => '/dashboard/configuracion'],
  ['Facturas', () => '/dashboard/facturas'],
  ['Nueva factura', () => '/dashboard/facturas/nueva'],
  ['Factura rápida', () => '/dashboard/facturas/rapida'],
  ['Ver factura', () => `/dashboard/facturas/ver?id=${facturaId}`],
  ['Órdenes', () => '/dashboard/ordenes'],
  ['Ficha de orden', () => `/dashboard/ordenes?orden=${ordenId}`],
  ['Nueva orden', () => '/dashboard/ordenes?nueva=1'],
  ['Vehículos', () => '/dashboard/vehiculos'],
  ['Nuevo vehículo', () => '/dashboard/vehiculos/nuevo'],
]

const TAMANOS = [
  ['móvil', { width: 390, height: 844 }],
  ['tablet', { width: 820, height: 1180 }],
  ['escritorio', { width: 1440, height: 900 }],
] as const

for (const [tamano, viewport] of TAMANOS) {
  test.describe(tamano, () => {
    test.use({ viewport })
    for (const [nombre, ruta] of PANTALLAS) {
      test(`${nombre} sin descuadres`, async ({ page }) => {
        await page.goto(ruta())
        await page.waitForLoadState('networkidle')
        if (nombre === 'Nueva factura') await expect(page.locator(`option[value="${clienteId}"]`)).toHaveCount(1)
        if (nombre === 'Clientes') await expect(page.getByText(/larguísimo de flota/)).toBeVisible()
        if (nombre === 'Ficha de orden' || nombre === 'Nueva orden') await expect(page.getByRole('dialog')).toBeVisible()
        await page.waitForTimeout(300) // fin de transiciones
        expect(await buscarDesbordes(page)).toEqual([])
      })
    }
  })
}
