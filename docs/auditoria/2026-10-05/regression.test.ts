/** Pruebas de invariantes contra el handler real; Supabase y Calendar están simulados.
 * Los fallos documentan defectos abiertos. No escribir en una base real. */
import { beforeEach, expect, test, vi } from 'vitest'
import { NextRequest } from 'next/server'
const state = vi.hoisted(() => ({
  invoices: [] as Record<string, unknown>[],
  lines: [] as Record<string, unknown>[],
  failLines: false,
  orderStatus: 'aprobado',
}))
vi.mock('@/lib/auth/middleware', () => ({
  getAuthenticatedUser: async () => ({ tallerId: 'test-workshop', userId: 'test-user' }),
  isAuthError: () => false,
  authErrorResponse: vi.fn(),
}))
vi.mock('@/app/api/calendar/google/events/route', () => ({syncOrdenCalendarEvent: async () => {}}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: {getUser: async () => ({data:{user:{id:'test-user',email:'test@example.invalid'}},error:null})}, from(table: string) {
    let insert: unknown = undefined
    let action = 'select'
    function result() {
      if (table === 'usuarios') return {data:{taller_id:'test-workshop'},error:null}
      if (table === 'taller_config') return {data:{serie_factura:'FA',porcentaje_iva:21,tarifa_hora:50},error:null}
      if (table === 'ordenes_reparacion') return {data:{id:'test-order',estado:state.orderStatus,cliente_id:'test-client',clientes:{nombre:'Ficticio'},iva_porcentaje:21},error:null}
      if (table === 'lineas_orden') return {data:[{tipo:'mano_obra',cantidad:2,precio_unitario:0,descripcion:'Trabajo ficticio'}],error:null}
      if (table === 'facturas' && action === 'insert') {
        const invoice = {...(insert as Record<string,unknown>[])[0],id:'test-invoice'}
        if (!state.invoices.length) state.invoices.push(invoice)
        return {data:invoice,error:null}
      }
      if (table === 'facturas') return {data:null,error:null}
      if (table === 'detalles_factura' && action === 'insert') {
        if (state.failLines) return {data:null,error:{message:'Injected line failure',code:'TEST'}}
        if (!state.lines.length) state.lines.push(...insert as Record<string,unknown>[])
        return {data:null,error:null}
      }
      return {data:null,error:null}
    }
    const query = {
      select: () => query, eq: () => query,
      insert: (payload: unknown) => { action='insert';insert=payload;return query },
      update: () => {action='update';return query},
      delete: () => {action='delete';if(table==='facturas')state.invoices=[];return query},
      single: async () => result(), maybeSingle: async () => result(),
      then: (resolve: (v: unknown) => unknown) => Promise.resolve(result()).then(resolve),
    }
    return query
  } }),
}))
import { POST } from '@/app/api/facturas/desde-orden/route'
beforeEach(() => {state.invoices=[];state.lines=[];state.failLines=false;state.orderStatus='aprobado';vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'error').mockImplementation(()=>{})})
function request(){return new NextRequest('http://localhost/api/facturas/desde-orden',{method:'POST',body:JSON.stringify({orden_id:'test-order'}),headers:{'Content-Type':'application/json'}})}
test('cabecera y detalles mantienen la misma base al aplicar la tarifa de mano de obra',async()=>{
 const r=await POST(request());expect(r.status).toBe(200)
 const detailsBase=state.lines.reduce((s,l)=>s+Number(l.base_imponible),0)
 expect(state.invoices[0].base_imponible).toBe(detailsBase)
})
test('un error al guardar detalles no deja un borrador huérfano',async()=>{
 state.failLines=true
 const r=await POST(request());expect(r.status).toBe(500)
 expect(state.invoices).toHaveLength(0)
})

import { PATCH } from '@/app/api/ordenes/route'
test('la API directa impide editar una orden ya facturada',async()=>{
 state.orderStatus='facturado'
 const r=await PATCH(new NextRequest('http://localhost/api/ordenes',{method:'PATCH',body:JSON.stringify({id:'test-order',notas:'Modificación tras facturar'}),headers:{'Content-Type':'application/json'}}))
 expect(r.status).toBe(409)
})
