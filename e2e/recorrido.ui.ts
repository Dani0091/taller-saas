import { test, expect, request as pwRequest, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'node:fs'
import { SIN_SESION } from './sin-sesion'

// Recorrido exhaustivo de la interfaz con sesión del admin QA A (Supabase LOCAL).
// Falla con errores claros: excepciones JS, respuestas 5xx, enlaces internos rotos.
// Informe para revisión humana (test-results/recorrido.md): botones con el mismo
// texto repetidos en una pantalla y botones sin efecto aparente.

const CLIENTE_A = '00000000-0000-4000-a000-0000000c1a01'
const VEHICULO_A = '00000000-0000-4000-a000-0000000e1a01'
const MAX_BOTONES_POR_PAGINA = 45
const EXCLUIR = /cerrar sesi[oó]n|salir|logout/i

type Hallazgo = { pagina: string; tipo: string; detalle: string }
const errores: Hallazgo[] = []
const avisos: Hallazgo[] = []
const resumen: Array<{ pagina: string; botones: number; pulsados: number; enlaces: number }> = []

const db = () =>
  createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

function vigilar(page: Page, pagina: string) {
  page.on('pageerror', (e) => errores.push({ pagina, tipo: 'excepción JS', detalle: e.message.slice(0, 200) }))
  page.on('response', (r) => {
    if (r.status() >= 500) errores.push({ pagina, tipo: `HTTP ${r.status()}`, detalle: r.url().replace(/^https?:\/\/[^/]+/, '') })
  })
}

async function estado(page: Page) {
  return page.evaluate(() => ({
    url: location.href,
    html: document.body.innerHTML.length + ':' + document.querySelectorAll('[role="dialog"],[data-state="open"]').length,
  }))
}

async function botonesVisibles(page: Page) {
  return page.locator('button:visible, [role="button"]:visible').evaluateAll((els) =>
    els.map((el, i) => ({
      i,
      etiqueta: ((el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim()).slice(0, 60),
      deshabilitado: (el as HTMLButtonElement).disabled === true,
    }))
  )
}

test.describe.configure({ mode: 'serial' })
test.setTimeout(30 * 60_000)

let paginas: string[] = []
let tokenPresupuesto = ''

test('preparar datos de recorrido', async ({ request }) => {
  const orden = await (await request.post('/api/ordenes', {
    data: { numero_orden: `QA-REC-${Date.now()}`, cliente_id: CLIENTE_A, vehiculo_id: VEHICULO_A, estado: 'aprobado', descripcion_problema: 'Recorrido UI' },
  })).json()
  const ordenId = orden.orden.id as string
  await db().from('lineas_orden').insert({ orden_id: ordenId, tipo: 'mano_obra', descripcion: 'Recorrido', cantidad: 1, precio_unitario: 30, iva_porcentaje: 21 })

  const orden2 = await (await request.post('/api/ordenes', {
    data: { numero_orden: `QA-REC2-${Date.now()}`, cliente_id: CLIENTE_A, vehiculo_id: VEHICULO_A, estado: 'aprobado' },
  })).json()
  await db().from('lineas_orden').insert({ orden_id: orden2.orden.id, tipo: 'pieza', descripcion: 'Pieza QA', cantidad: 2, precio_unitario: 15, iva_porcentaje: 21 })
  const compartir = await (await request.post('/api/ordenes/compartir', { data: { orden_id: orden2.orden.id } })).json()
  tokenPresupuesto = String(compartir.url).split('/presupuesto/')[1]

  const cobro = await (await request.post('/api/facturas/cobro-rapido', { data: { orden_id: ordenId, serie: 'QA' } })).json()
  expect(cobro.id, JSON.stringify(cobro)).toBeTruthy()

  paginas = [
    '/dashboard', '/dashboard/ordenes', '/dashboard/clientes', '/dashboard/clientes/nuevo',
    '/dashboard/vehiculos', '/dashboard/vehiculos/nuevo', '/dashboard/citas',
    '/dashboard/facturas', '/dashboard/facturas/nueva', '/dashboard/facturas/rapida',
    `/dashboard/facturas/ver?id=${cobro.id}`, '/dashboard/configuracion',
  ]
})

test('todas las páginas, enlaces y botones', async ({ page, baseURL }) => {
  const enlacesVistos = new Set<string>()
  // Un único manejador: cancela confirm()/alert() que abra cualquier botón.
  page.on('dialog', (d) => { d.dismiss().catch(() => {}) })

  for (const ruta of paginas) {
    const nombre = ruta.split('?')[0]
    vigilar(page, nombre)
    await page.goto(ruta)
    await page.waitForLoadState('networkidle')
    expect(page.url(), `${ruta} redirige al login`).not.toContain('/auth/login')

    for (const href of await page.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!))) {
      enlacesVistos.add(href.split('#')[0])
    }

    const botones = await botonesVisibles(page)
    const porEtiqueta = new Map<string, number>()
    for (const b of botones) if (b.etiqueta) porEtiqueta.set(b.etiqueta, (porEtiqueta.get(b.etiqueta) ?? 0) + 1)
    for (const [etiqueta, n] of porEtiqueta) if (n > 1) avisos.push({ pagina: nombre, tipo: 'botón repetido', detalle: `"${etiqueta}" ×${n}` })
    for (const b of botones) if (!b.etiqueta) avisos.push({ pagina: nombre, tipo: 'botón sin texto ni aria-label', detalle: `índice ${b.i}` })

    let pulsados = 0
    for (const b of botones.slice(0, MAX_BOTONES_POR_PAGINA)) {
      if (b.deshabilitado || EXCLUIR.test(b.etiqueta)) continue
      await page.goto(ruta)
      await page.waitForLoadState('networkidle')
      const objetivo = page.locator('button:visible, [role="button"]:visible').nth(b.i)
      if (!(await objetivo.count())) continue
      const antes = await estado(page)
      let peticiones = 0
      const contar = () => { peticiones += 1 }
      page.on('request', contar)
      await objetivo.click({ timeout: 3000, trial: false }).catch(() => {})
      await page.waitForTimeout(700)
      page.off('request', contar)
      const despues = await estado(page).catch(() => antes)
      pulsados += 1
      if (despues.url === antes.url && despues.html === antes.html && peticiones === 0) {
        avisos.push({ pagina: nombre, tipo: 'botón sin efecto aparente', detalle: `"${b.etiqueta || `#${b.i}`}"` })
      }
    }
    resumen.push({ pagina: nombre, botones: botones.length, pulsados, enlaces: enlacesVistos.size })
    page.removeAllListeners('pageerror')
    page.removeAllListeners('response')
  }

  // Enlaces internos: ninguno roto
  for (const href of enlacesVistos) {
    const r = await page.request.get(href, { maxRedirects: 5 })
    if (r.status() >= 400) errores.push({ pagina: href, tipo: `enlace roto ${r.status()}`, detalle: href })
  }

  // Presupuesto público, sin sesión
  const publico = await pwRequest.newContext({ baseURL, storageState: SIN_SESION })
  expect((await publico.get(`/presupuesto/${tokenPresupuesto}`)).status()).toBe(200)
  await publico.dispose()
})

test.afterAll(() => {
  mkdirSync('test-results', { recursive: true })
  const md = [
    '# Recorrido de interfaz (local, QA A)', '',
    '| Página | Botones visibles | Pulsados | Enlaces acumulados |', '|---|---|---|---|',
    ...resumen.map((r) => `| ${r.pagina} | ${r.botones} | ${r.pulsados} | ${r.enlaces} |`), '',
    `## Errores (${errores.length})`, ...errores.map((e) => `- **${e.pagina}** · ${e.tipo} · ${e.detalle}`), '',
    `## Para revisar (${avisos.length})`, ...avisos.map((a) => `- **${a.pagina}** · ${a.tipo} · ${a.detalle}`),
  ].join('\n')
  writeFileSync('test-results/recorrido.md', md)
  writeFileSync('test-results/recorrido.json', JSON.stringify({ resumen, errores, avisos }, null, 2))
})

test('sin errores en el recorrido', () => {
  expect(errores, errores.map((e) => `${e.pagina}: ${e.tipo} ${e.detalle}`).join('\n')).toEqual([])
})
