import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Inicio: las cifras salen de los estados reales de las órdenes y solo de
// facturas emitidas. Antes «En reparación» y «Terminadas» salían siempre 0 y
// lo facturado sumaba borradores y anuladas.

const A = '00000000-0000-4000-a000-00000000a0a1'
const CLIENTE_A = '00000000-0000-4000-a000-0000000c1a01'
const db = () =>
  createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

const euros = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' })

test('órdenes por estado y facturado del mes cuadran con la base de datos', async ({ page }) => {
  await db().from('ordenes_reparacion').insert([
    { taller_id: A, numero_orden: `QA-INI-${Date.now()}-1`, estado: 'en_progreso', cliente_id: CLIENTE_A },
    { taller_id: A, numero_orden: `QA-INI-${Date.now()}-2`, estado: 'finalizado', cliente_id: CLIENTE_A },
  ])
  const contar = async (estados: string[]) =>
    (await db().from('ordenes_reparacion').select('id', { count: 'exact', head: true }).eq('taller_id', A).is('deleted_at', null).in('estado', estados)).count ?? 0

  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())
  const { data: facturas } = await db().from('facturas').select('total, estado').eq('taller_id', A).is('deleted_at', null)
    .gte('fecha_emision', `${hoy.slice(0, 7)}-01`).lte('fecha_emision', hoy)
  const facturado = (facturas ?? []).filter((f) => ['emitida', 'enviada', 'pagada', 'vencida'].includes(f.estado)).reduce((s, f) => s + Number(f.total), 0)

  await page.goto('/dashboard')
  const grupo = (nombre: string) => page.locator('li').filter({ has: page.getByText(nombre, { exact: true }) })
  await expect(grupo('En reparación')).toContainText(String(await contar(['en_progreso'])))
  await expect(grupo('Terminadas')).toContainText(String(await contar(['finalizado'])))
  expect(await contar(['en_progreso'])).toBeGreaterThan(0)

  const cifra = page.getByRole('region', { name: /facturado en/i })
  await expect(cifra).toContainText(euros(Math.round(facturado * 100) / 100))

  // Enlace al trimestre: abre facturas con ese trimestre elegido
  await page.getByRole('link', { name: /ver y exportar el trimestre/i }).click()
  await expect(page.getByRole('group', { name: 'Trimestres' }).locator('[aria-pressed="true"]')).toHaveCount(1)
})
