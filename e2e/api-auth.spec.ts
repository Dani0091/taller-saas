import { test, expect } from '@playwright/test'

// Regresión de A08/A09/A12/A13: sin sesión, ninguna ruta privada responde datos.
// Solo GET y POST con cuerpo vacío, que fallan antes de cualquier escritura o envío.

const GET_401 = [
  'ordenes',
  'vehiculos',
  'citas',
  'diagnostico',
  'series/obtener',
  'taller/plan',
  'configuracion/api-keys',
  'calendar/google/status',
  'clientes',
  'facturas/detalles',
]

const POST_401 = [
  'facturas/crear',
  'facturas/desde-orden',
  'facturas/emitir',
  'facturas/cobro-rapido',
  'facturas/rapida',
  'clientes/crear',
  'ordenes/compartir',
  'facturas/generar-verifactu',
  'taller/config/actualizar',
]

test.describe('API sin sesión', () => {
  // Las peticiones no dependen del navegador: basta con un proyecto.
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== 'chromium', 'solo una vez')
  })

  for (const ruta of GET_401) {
    test(`GET /api/${ruta} → 401`, async ({ request }) => {
      const r = await request.get(`/api/${ruta}`, { maxRedirects: 0 })
      expect(r.status()).toBe(401)
    })
  }

  for (const ruta of POST_401) {
    test(`POST /api/${ruta} → 401`, async ({ request }) => {
      const r = await request.post(`/api/${ruta}`, { data: {}, maxRedirects: 0 })
      expect(r.status()).toBe(401)
    })
  }

  test('GET /api/config/sistema es público → 200', async ({ request }) => {
    const r = await request.get('/api/config/sistema')
    expect(r.status()).toBe(200)
  })

  test('A13: proxy de imagen rechaza hosts no permitidos → 403', async ({ request }) => {
    const r = await request.get('/api/image/proxy?url=' + encodeURIComponent('https://example.com/x.jpg'))
    expect(r.status()).toBe(403)
  })

  test('A12: rutas DISABLED_ ya no existen → 404', async ({ request }) => {
    expect((await request.get('/api/facturas/DISABLED_obtener')).status()).toBe(404)
    expect((await request.get('/dashboard/facturas/DISABLED_generar')).status()).toBe(404)
  })

  // Eliminadas en 0dcd5c4 (sin callers). Un 404 confirma que no siguen expuestas.
  for (const ruta of ['factura/lineas/agregar', 'factura/lineas/obtener', 'clientes/eliminar', 'ordenes/clientes']) {
    test(`ruta eliminada /api/${ruta} → 404`, async ({ request }) => {
      expect((await request.post(`/api/${ruta}`, { data: {}, maxRedirects: 0 })).status()).toBe(404)
    })
  }
})
