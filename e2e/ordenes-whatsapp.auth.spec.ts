import { test, expect } from '@playwright/test'

// WhatsApp desde una orden: al teléfono del cliente CON prefijo 34 y sin huecos
// en el texto. Antes el presupuesto abría wa.me/600000001 (número inexistente).

const CLIENTE_A = '00000000-0000-4000-a000-0000000c1a01' // teléfono 600000001
const VEHICULO_A = '00000000-0000-4000-a000-0000000e1a01'

test('presupuesto y orden por WhatsApp llegan al cliente con prefijo 34', async ({ page, request }) => {
  const numero = `QA-WA-${Date.now()}`
  const r = await request.post('/api/ordenes', {
    data: { numero_orden: numero, cliente_id: CLIENTE_A, vehiculo_id: VEHICULO_A, estado: 'pendiente', descripcion_problema: 'Ruido QA' },
  })
  expect(r.status(), await r.text()).toBe(201)

  await page.addInitScript(() => {
    ;(window as unknown as { abiertas: string[] }).abiertas = []
    window.open = ((url?: string | URL) => { (window as unknown as { abiertas: string[] }).abiertas.push(String(url)); return null }) as typeof window.open
  })
  const abiertas = () => page.evaluate(() => (window as unknown as { abiertas: string[] }).abiertas)

  await page.goto('/dashboard/ordenes')
  await page.getByText(numero).first().click()

  // Presupuesto
  await page.getByRole('button', { name: /enviar presupuesto al cliente/i }).click()
  await page.getByRole('button', { name: /^whatsapp$/i }).click()
  await expect.poll(abiertas).toHaveLength(1)
  const presupuesto = new URL((await abiertas())[0])
  expect(`${presupuesto.origin}${presupuesto.pathname}`).toBe('https://wa.me/34600000001')
  const textoP = presupuesto.searchParams.get('text') ?? ''
  expect(textoP).toMatch(/^Hola Cliente QA Válido, te enviamos el presupuesto/)
  expect(textoP).toMatch(/Ver presupuesto: https?:\/\/\S+\/presupuesto\/[0-9a-f-]{36}/)

  // PENDIENTE: WhatsApp del visor "Ver / Imprimir Orden Completa" (cubierto solo por unitarios de mensajeOrden)
})
