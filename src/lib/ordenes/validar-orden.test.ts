import { describe, it, expect, vi } from 'vitest'
import { filtrarCamposOrden, validarVinculosTaller } from './validar-orden'

describe('filtrarCamposOrden', () => {
  it('descarta columnas de control enviadas por el cliente', () => {
    const r = filtrarCamposOrden({
      numero_orden: 'OR-1', notas: 'ok',
      taller_id: 'otro', token_publico: 't', deleted_at: 'x', fecha_aceptacion_cliente: 'x',
      numero_visual: 9, id: 'y', created_at: 'z', presupuesto_aprobado_por_cliente: true,
    }, 'crear')
    expect(r).toEqual({ ok: true, datos: { numero_orden: 'OR-1', notas: 'ok' } })
  })

  it('al editar no acepta numero_orden', () => {
    const r = filtrarCamposOrden({ numero_orden: 'OR-2', notas: 'n' }, 'editar')
    expect(r).toEqual({ ok: true, datos: { notas: 'n' } })
  })

  it('rechaza el estado facturado en crear y editar', () => {
    expect(filtrarCamposOrden({ numero_orden: 'OR-1', estado: 'facturado' }, 'crear').ok).toBe(false)
    expect(filtrarCamposOrden({ estado: 'facturado' }, 'editar').ok).toBe(false)
    expect(filtrarCamposOrden({ estado: 'aprobado' }, 'editar').ok).toBe(true)
  })

  it('crear exige numero_orden no vacío', () => {
    expect(filtrarCamposOrden({ notas: 'x' }, 'crear').ok).toBe(false)
    expect(filtrarCamposOrden({ numero_orden: '   ' }, 'crear').ok).toBe(false)
  })

  it('ids vacíos pasan a null', () => {
    const r = filtrarCamposOrden({ cliente_id: '', vehiculo_id: '', operario_id: '' }, 'editar')
    expect(r).toEqual({ ok: true, datos: { cliente_id: null, vehiculo_id: null, operario_id: null } })
  })

  it.each([null, undefined, 'texto', 42, [1, 2]])('cuerpo no objeto (%s) → error', (body) => {
    expect(filtrarCamposOrden(body, 'editar').ok).toBe(false)
  })
})

describe('validarVinculosTaller', () => {
  function supabaseQueEncuentra(existentes: Set<string>) {
    const from = vi.fn((tabla: string) => ({
      select: () => ({
        eq: (_c: string, id: string) => ({
          eq: () => ({ maybeSingle: async () => ({ data: existentes.has(`${tabla}:${id}`) ? { id } : null }) }),
        }),
      }),
    }))
    return { client: { from } as never, from }
  }

  it('sin vínculos no consulta nada', async () => {
    const { client, from } = supabaseQueEncuentra(new Set())
    expect(await validarVinculosTaller(client, 't', { notas: 'x', cliente_id: null })).toBeNull()
    expect(from).not.toHaveBeenCalled()
  })

  it('vínculos del propio taller → válido', async () => {
    const { client } = supabaseQueEncuentra(new Set(['clientes:c1', 'vehiculos:v1']))
    expect(await validarVinculosTaller(client, 't', { cliente_id: 'c1', vehiculo_id: 'v1' })).toBeNull()
  })

  it('cliente de otro taller → error', async () => {
    const { client } = supabaseQueEncuentra(new Set(['vehiculos:v1']))
    expect(await validarVinculosTaller(client, 't', { cliente_id: 'ajeno', vehiculo_id: 'v1' })).toMatch(/cliente_id/)
  })

  it('id que no es texto → error', async () => {
    const { client } = supabaseQueEncuentra(new Set())
    expect(await validarVinculosTaller(client, 't', { vehiculo_id: 123 })).toMatch(/inválido/)
  })
})
