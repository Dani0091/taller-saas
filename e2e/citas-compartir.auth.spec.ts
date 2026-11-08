import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Compartir una cita guardada: calendario y WhatsApp, sin efectos secundarios.
test.use({ timezoneId: 'Europe/Madrid' })

const A = '00000000-0000-4000-a000-00000000a0a1'
const CLIENTE_A = '00000000-0000-4000-a000-0000000c1a01' // teléfono 600000001
const VEHICULO_A = '00000000-0000-4000-a000-0000000e1a01' // Seat Ibiza 0000QAA

const db = () =>
  createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

/** Instante de hoy a la hora indicada en Madrid. */
function hoyEnMadrid(hora: number, minuto = 0): string {
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())
  // Prueba +1 y +2 (invierno/verano) y se queda con la que da esa hora en Madrid.
  for (const off of ['+01:00', '+02:00']) {
    const d = new Date(`${hoy}T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00${off}`)
    if (d.toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' }) === `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`) return d.toISOString()
  }
  throw new Error('sin offset válido')
}

test('compartir una cita: el calendario no guarda el formulario y WhatsApp lleva todo correcto', async ({ page }) => {
  const sello = Date.now()
  const titulo = `Compartir ${sello}`
  const direccion = `Calle QA ${sello}, Madrid`
  await db().from('taller_config').update({ nombre_empresa: `Taller Compartir ${sello}`, direccion }).eq('taller_id', A)
  const inicio = hoyEnMadrid(9)
  const fin = hoyEnMadrid(10, 30)
  const { data: cita, error } = await db().from('citas').insert({
    taller_id: A, titulo, tipo: 'cita', estado: 'pendiente',
    cliente_id: CLIENTE_A, vehiculo_id: VEHICULO_A, fecha_inicio: inicio, fecha_fin: fin, todo_el_dia: false,
  }).select('id').single()
  expect(error).toBeNull()

  // window.open no abre nada: se apuntan las URLs
  await page.addInitScript(() => {
    ;(window as unknown as { abiertas: string[] }).abiertas = []
    window.open = ((url?: string | URL) => { (window as unknown as { abiertas: string[] }).abiertas.push(String(url)); return null }) as typeof window.open
  })
  const escrituras: string[] = []
  page.on('request', (r) => { if (r.url().includes('/api/citas') && r.method() !== 'GET') escrituras.push(`${r.method()} ${r.url()}`) })

  await page.goto('/dashboard/citas')
  await page.getByRole('button', { name: /^día$/i }).click()
  await page.getByText(titulo).first().click()
  await expect(page.locator('#titulo')).toHaveValue(titulo)
  await expect(page.locator('#fecha_inicio')).toHaveValue(/T09:00$/)

  // Calendario → Google: abre el enlace y NO envía el formulario
  const menu = page.getByRole('button', { name: /calendario/i })
  await menu.click()
  await expect(menu).toHaveAttribute('aria-expanded', 'true')
  await page.getByRole('menuitem', { name: /google calendar/i }).click()
  const abiertas = () => page.evaluate(() => (window as unknown as { abiertas: string[] }).abiertas)
  await expect.poll(abiertas).toHaveLength(1)
  const google = new URL((await abiertas())[0])
  expect(google.hostname).toBe('calendar.google.com')
  expect(google.searchParams.get('dates')).toBe(`${inicio.replace(/[-:]/g, '').replace('.000', '')}/${fin.replace(/[-:]/g, '').replace('.000', '')}`)
  expect(google.searchParams.get('location')).toBe(direccion)
  await expect(page.locator('#titulo')).toBeVisible() // el formulario sigue abierto
  expect(escrituras).toEqual([])

  // Escape cierra el menú
  await menu.click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menuitem', { name: /google calendar/i })).toHaveCount(0)

  // WhatsApp: número con prefijo 34 y mensaje completo
  await page.getByRole('button', { name: /enviar por whatsapp/i }).click()
  await expect.poll(abiertas).toHaveLength(2)
  const wa = new URL((await abiertas())[1])
  expect(`${wa.origin}${wa.pathname}`).toBe('https://wa.me/34600000001')
  const texto = wa.searchParams.get('text') ?? ''
  expect(texto).toContain(`*Cita en Taller Compartir ${sello}*`)
  expect(texto).toContain('Hola Cliente QA Válido')
  expect(texto).toContain('de 09:00 a 10:30')
  expect(texto).toContain('Seat Ibiza 0000QAA')
  expect(texto).toContain(`📍 ${direccion}`)
  expect(texto).toContain('https://calendar.google.com/calendar/render?')
  expect(texto).not.toContain('undefined')
  expect(escrituras).toEqual([])

  await db().from('citas').delete().eq('id', cita!.id)
})

test('editar una cita la actualiza (no crea otra) y borrarla pide confirmación', async ({ page }) => {
  const titulo = `Editar ${Date.now()}`
  const { data: cita } = await db().from('citas').insert({
    taller_id: A, titulo, tipo: 'cita', estado: 'pendiente', fecha_inicio: hoyEnMadrid(11), fecha_fin: hoyEnMadrid(12), todo_el_dia: false,
  }).select('id').single()

  await page.goto('/dashboard/citas')
  await page.getByRole('button', { name: /^día$/i }).click()
  await page.getByText(titulo).first().click()
  await expect(page.locator('#titulo')).toHaveValue(titulo)
  await expect(page.locator('#fecha_inicio')).toHaveValue(/T11:00$/)

  await page.locator('#titulo').fill(`${titulo} editada`)
  await page.getByRole('button', { name: /^guardar$/i }).click()
  await expect.poll(async () => {
    const { data } = await db().from('citas').select('id, titulo, fecha_inicio').like('titulo', `${titulo}%`)
    return data
  }, { timeout: 15_000 }).toEqual([{ id: cita!.id, titulo: `${titulo} editada`, fecha_inicio: expect.any(String) }])
  // La hora no se movió al guardar
  const { data: tras } = await db().from('citas').select('fecha_inicio').eq('id', cita!.id).single()
  expect(new Date(tras!.fecha_inicio).toISOString()).toBe(hoyEnMadrid(11))

  // Borrar: si se cancela la confirmación, sigue existiendo; si se acepta, desaparece
  await page.getByRole('button', { name: /^día$/i }).click()
  await page.getByText(`${titulo} editada`).first().click()
  page.once('dialog', (d) => d.dismiss())
  await page.getByRole('button', { name: /eliminar cita/i }).click()
  expect((await db().from('citas').select('id').eq('id', cita!.id)).data).toHaveLength(1)
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: /eliminar cita/i }).click()
  await expect.poll(async () => (await db().from('citas').select('id').eq('id', cita!.id)).data, { timeout: 15_000 }).toEqual([])
})

test('API de cita: inexistente 404, JSON roto 400, otro taller 404', async ({ request }) => {
  const nada = '00000000-0000-4000-a000-0000000dead0'
  expect((await request.get(`/api/citas/${nada}`)).status()).toBe(404)
  expect((await request.put(`/api/citas/${nada}`, { data: { titulo: 'x' } })).status()).toBe(404)
  const { data: cita } = await db().from('citas').insert({
    taller_id: A, titulo: `API ${Date.now()}`, tipo: 'cita', estado: 'pendiente', fecha_inicio: hoyEnMadrid(13), todo_el_dia: false,
  }).select('id').single()
  // Sin Google conectado (QA no lo tiene) guardar funciona y no deja referencias a Google
  expect((await request.put(`/api/citas/${cita!.id}`, { data: { titulo: 'API editada' } })).status()).toBe(200)
  expect((await db().from('google_calendar_events').select('id').eq('referencia_id', cita!.id)).data).toEqual([])
  expect((await request.post('/api/citas', { data: '{roto', headers: { 'content-type': 'application/json' } })).status()).toBe(400)
  const roto = await request.put(`/api/citas/${cita!.id}`, { data: '{roto', headers: { 'content-type': 'application/json' } })
  expect(roto.status()).toBe(400)
  expect((await request.put(`/api/citas/${cita!.id}`, { data: [1, 2] })).status()).toBe(400)
  await db().from('citas').delete().eq('id', cita!.id)

  const B = '00000000-0000-4000-a000-00000000b0b1'
  const { data: deB } = await db().from('citas').insert({
    taller_id: B, titulo: `De B ${Date.now()}`, tipo: 'cita', estado: 'pendiente', fecha_inicio: hoyEnMadrid(13), todo_el_dia: false,
  }).select('id').single()
  expect((await request.get(`/api/citas/${deB!.id}`)).status()).toBe(404)
  expect((await request.put(`/api/citas/${deB!.id}`, { data: { titulo: 'robada' } })).status()).toBe(404)
  await request.delete(`/api/citas/${deB!.id}`)
  const { data: sigue } = await db().from('citas').select('titulo').eq('id', deB!.id).single()
  expect(sigue!.titulo).not.toBe('robada')
  await db().from('citas').delete().eq('id', deB!.id)
})

test('botones del calendario: un solo "Nueva cita" en cada vista y sin botones mudos', async ({ page }) => {
  await page.goto('/dashboard/citas')
  for (const vista of ['Mes', 'Semana', 'Día']) {
    const boton = page.getByRole('button', { name: new RegExp(`^${vista}$`, 'i') })
    await boton.click()
    await expect(boton).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: /nueva|crear cita/i })).toHaveCount(1)
    // Todo botón visible tiene nombre (texto, aria-label o title)
    expect(await page.locator('main button:visible').count(), vista).toBeGreaterThan(5)
    const mudos = await page.locator('main button:visible').evaluateAll((bs) =>
      bs.filter((b) => !(b.textContent?.trim() || b.getAttribute('aria-label') || b.getAttribute('title'))).map((b) => b.outerHTML.slice(0, 120)))
    expect(mudos, vista).toEqual([])
  }

  // En vista Mes, sin elegir día, "Nueva cita" propone hoy a las 09:00
  await page.getByRole('button', { name: /^mes$/i }).click()
  await page.getByRole('button', { name: /^nueva cita$/i }).click()
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())
  await expect(page.locator('#fecha_inicio')).toHaveValue(`${hoy}T09:00`)
  await page.getByRole('button', { name: /^cancelar$/i }).click()
  await expect(page.locator('#fecha_inicio')).toHaveCount(0)
})
