import { test, expect, request as pwRequest } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import JSZip from 'jszip'
import { readFileSync } from 'node:fs'
import { SIN_SESION } from './sin-sesion'

// Exportación por trimestre para Hacienda: ZIP con el PDF de cada factura
// expedida en el trimestre y el libro de facturas emitidas en CSV.

const A = '00000000-0000-4000-a000-00000000a0a1'
const B = '00000000-0000-4000-a000-00000000b0b1'
const db = () =>
  createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

// Trimestre actual en Madrid (las facturas del laboratorio se emiten hoy)
const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())
const [año, mes] = hoy.split('-').map(Number)
const t = Math.floor((mes - 1) / 3) + 1
const CLAVE = `${año}-T${t}`
const desde = `${año}-${String((t - 1) * 3 + 1).padStart(2, '0')}-01`

async function esperadas(taller: string) {
  const { data } = await db().from('facturas').select('id, numero_factura, estado')
    .eq('taller_id', taller).is('deleted_at', null).neq('estado', 'borrador').not('numero_factura', 'is', null)
    .gte('fecha_emision', desde).lte('fecha_emision', hoy)
  return data ?? []
}

test('API: solo el taller de la sesión, sin borradores; 400 y 401', async ({ request, baseURL }) => {
  const r = await request.get(`/api/facturas/exportar?trimestre=${CLAVE}`)
  expect(r.status(), await r.text()).toBe(200)
  const cuerpo = await r.json()
  const ids = (cuerpo.facturas as Array<{ id: string; estado: string; fecha_emision: string }>)
  const deA = await esperadas(A)
  expect(deA.length).toBeGreaterThan(0)
  expect(ids.map((f) => f.id).sort()).toEqual(deA.map((f) => f.id).sort())
  expect(ids.every((f) => f.estado !== 'borrador' && f.fecha_emision >= desde)).toBe(true)
  expect(cuerpo.plazo.desde).toMatch(/^\d{4}-\d{2}-01$/)

  const b = await pwRequest.newContext({ baseURL, storageState: 'playwright/.auth/qa-b.json' })
  const deB = (await (await b.get(`/api/facturas/exportar?trimestre=${CLAVE}`)).json()).facturas as Array<{ id: string }>
  const idsA = new Set(deA.map((f) => f.id))
  expect(deB.some((f) => idsA.has(f.id))).toBe(false)
  expect(deB.length).toBe((await esperadas(B)).length)
  await b.dispose()

  expect((await request.get('/api/facturas/exportar?trimestre=2026-T5')).status()).toBe(400)
  const anon = await pwRequest.newContext({ baseURL, storageState: SIN_SESION })
  expect((await anon.get(`/api/facturas/exportar?trimestre=${CLAVE}`)).status()).toBe(401)
  await anon.dispose()
})

test('pantalla: elegir el trimestre filtra el listado y «Exportar» descarga PDF + libro CSV', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/dashboard/facturas')
  const tarjeta = page.getByRole('group', { name: 'Trimestres' }).getByRole('button', { name: new RegExp(`^${t}T ${año}`) })
  await tarjeta.click()
  await expect(tarjeta).toHaveAttribute('aria-pressed', 'true')

  const deA = await esperadas(A)
  const [descarga] = await Promise.all([
    page.waitForEvent('download', { timeout: 150_000 }),
    page.getByRole('button', { name: new RegExp(`^Exportar ${t}T ${año}$`) }).click(),
  ])
  expect(descarga.suggestedFilename()).toBe(`Facturas_${t}T_${año}.zip`)
  const zip = await JSZip.loadAsync(readFileSync((await descarga.path())!))
  const csv = await zip.file(`Libro_facturas_emitidas_${t}T_${año}.csv`)!.async('string')
  const lineas = csv.replace(/^﻿/, '').trim().split('\r\n')
  expect(lineas[1]).toBe('Número;Fecha expedición;Tipo;Estado;Cliente;NIF cliente;Base imponible;Tipo IVA (%);Cuota IVA;Total')
  // título + cabecera + una fila por factura + línea en blanco + totales
  expect(lineas.length).toBe(deA.length + 4)
  for (const f of deA) expect(csv).toContain(`${f.numero_factura};`)
  const pdfs = Object.keys(zip.files).filter((n) => n.startsWith('PDF/') && n.endsWith('.pdf'))
  expect(pdfs.length).toBe(deA.length)
  expect((await zip.file(pdfs[0])!.async('uint8array')).subarray(0, 4)).toEqual(new Uint8Array([0x25, 0x50, 0x44, 0x46]))
})
