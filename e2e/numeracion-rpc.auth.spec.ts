import { test, expect } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

// Lo aplicado en producción el 2026-11-08 (supabase/propuestas/2026-11-08-aplicar),
// reproducido en el Supabase local por supabase/local/07_produccion_2026-11-08.sql:
// - SEC-02: ninguna RPC de numeración se puede llamar sin sesión.
// - A06: v4 solo numera para el taller del usuario y no trunca desde 1000.

const url = process.env.E2E_SUPABASE_URL!
const anonKey = process.env.E2E_SUPABASE_ANON_KEY!
const A = '00000000-0000-4000-a000-00000000a0a1'
const B = '00000000-0000-4000-a000-00000000b0b1'
const sinSesion = { auth: { persistSession: false, autoRefreshToken: false } }
const db = () => createClient(url, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!, sinSesion)

test.describe.configure({ mode: 'serial' })

// Usuario propio del test en el taller A: la contraseña de los admins QA no se guarda
const email = `qa-numeracion-${Date.now()}@example.test`
const password = randomBytes(24).toString('base64url')
let usuarioA: SupabaseClient

test.beforeAll(async () => {
  expect(new URL(url).hostname).toMatch(/^(127\.0\.0\.1|localhost)$/)
  const { error } = await db().auth.admin.createUser({ email, password, email_confirm: true })
  expect(error).toBeNull()
  expect((await db().from('usuarios').update({ taller_id: A, rol: 'admin' }).eq('email', email)).error).toBeNull()
  usuarioA = createClient(url, anonKey, sinSesion)
  expect((await usuarioA.auth.signInWithPassword({ email, password })).error).toBeNull()
})

test.afterAll(async () => {
  const { data } = await db().auth.admin.listUsers()
  const u = data.users.find((x) => x.email === email)
  if (u) await db().auth.admin.deleteUser(u.id)
  await db().from('usuarios').delete().eq('email', email)
})

test('SEC-02: sin sesión no se puede pedir número con ninguna versión de la RPC', async () => {
  const anonimo = createClient(url, anonKey, sinSesion)
  for (const rpc of ['asignar_numero_factura_v2', 'asignar_numero_factura_v3', 'asignar_numero_factura_v4', 'asignar_numero_factura']) {
    const { data, error } = await anonimo.rpc(rpc, { p_taller_id: A, p_prefijo: 'QA' })
    expect(data, rpc).toBeNull()
    expect(error?.message ?? '', rpc).toMatch(/permission denied/i)
  }
})

test('A06: v4 numera para el propio taller con el formato de siempre', async () => {
  const { data: serie } = await db().from('series_factura').select('ultimo_numero').eq('taller_id', A).eq('prefijo', 'QA').single()
  const { data, error } = await usuarioA.rpc('asignar_numero_factura_v4', { p_taller_id: A, p_prefijo: 'QA' })
  expect(error).toBeNull()
  const siguiente = (serie!.ultimo_numero ?? 0) + 1
  expect(data).toEqual({ prefijo: 'QA', numero: siguiente, numero_completo: `QA-${String(siguiente).padStart(3, '0')}` })
})

test('A06: v4 rechaza pedir número de otro taller y no toca su contador', async () => {
  const antes = (await db().from('series_factura').select('prefijo, ultimo_numero').eq('taller_id', B)).data
  const { data, error } = await usuarioA.rpc('asignar_numero_factura_v4', { p_taller_id: B, p_prefijo: 'QA' })
  expect(data).toBeNull()
  expect(error?.message).toMatch(/Sin acceso a la numeración/)
  expect((await db().from('series_factura').select('prefijo, ultimo_numero').eq('taller_id', B)).data).toEqual(antes)
})

test('A06: desde 1000 no trunca (v3 daría QA-100)', async () => {
  const prefijo = `T${Date.now() % 100000}`
  expect((await db().from('series_factura').insert({ taller_id: A, nombre: 'QA 1000', prefijo, ultimo_numero: 999 })).error).toBeNull()
  const { data, error } = await usuarioA.rpc('asignar_numero_factura_v4', { p_taller_id: A, p_prefijo: prefijo })
  expect(error).toBeNull()
  expect((data as { numero_completo: string }).numero_completo).toBe(`${prefijo}-1000`)
  await db().from('series_factura').delete().eq('taller_id', A).eq('prefijo', prefijo)
})

// v4 rechaza a usuarios con activo = false; las RLS (y por tanto el resto de la
// app) no miran esa columna. Un usuario así factura hoy con v3 y debe seguir
// haciéndolo. (auth_id vacío no es un caso nuevo: las RLS ya lo bloquean todo.)
test('usuario con activo = false: la app sigue facturando (vuelta a v3)', async ({ request }) => {
  const emailAdmin = 'qa-a-admin@example.test'
  const { data: u } = await db().from('usuarios').select('activo').eq('email', emailAdmin).single()
  expect((await db().from('usuarios').update({ activo: false }).eq('email', emailAdmin)).error).toBeNull()
  try {
    const r = await request.post('/api/ordenes', {
      data: { numero_orden: `QA-NUM-${Date.now()}`, cliente_id: '00000000-0000-4000-a000-0000000c1a01', vehiculo_id: '00000000-0000-4000-a000-0000000e1a01', estado: 'finalizado', descripcion_problema: 'Numeración QA' },
    })
    expect(r.status(), await r.text()).toBe(201)
    const orden = (await r.json()).orden as { id: string }
    await db().from('lineas_orden').insert({ orden_id: orden.id, tipo: 'mano_obra', descripcion: 'MO', cantidad: 1, precio_unitario: 10, iva_porcentaje: 21 })
    const cobro = await request.post('/api/facturas/cobro-rapido', { data: { orden_id: orden.id, serie: 'QA' } })
    expect(cobro.status(), await cobro.text()).toBeLessThan(300)
    const { data: f } = await db().from('facturas').select('numero_factura').eq('orden_id', orden.id).single()
    expect(f!.numero_factura).toMatch(/^QA-\d{3,}$/)
  } finally {
    await db().from('usuarios').update({ activo: u!.activo }).eq('email', emailAdmin)
  }
})
