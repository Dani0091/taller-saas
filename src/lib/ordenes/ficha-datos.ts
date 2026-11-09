/**
 * @fileoverview Datos que la ficha de orden envía al guardar
 * @description Antes había tres copias (autoguardado, «Guardar» y antes de
 * facturar) con pequeñas diferencias entre '' y null. Los importes ya no se
 * envían: los calcula el servidor desde las líneas.
 */

export interface FormularioOrden {
  estado: string
  cliente_id: string
  vehiculo_id: string
  descripcion_problema?: string
  observaciones_cliente?: string
  diagnostico?: string
  trabajos_realizados?: string
  notas?: string
  presupuesto_aprobado_por_cliente?: boolean
  tiempo_estimado_horas?: number
  tiempo_real_horas?: number
  fotos_entrada?: string
  fotos_salida?: string
  fotos_diagnostico?: string
  nivel_combustible?: string
  renuncia_presupuesto?: boolean
  accion_imprevisto?: string
  recoger_piezas?: boolean
  danos_carroceria?: string
  coste_diario_estancia?: number
  kilometros_entrada?: number
  kilometros_salida?: number
  fecha_prevista_entrega?: string | null
  iva_porcentaje?: number
}

export function datosOrdenFicha(f: FormularioOrden): Record<string, unknown> {
  return {
    estado: f.estado,
    cliente_id: f.cliente_id || null,
    vehiculo_id: f.vehiculo_id || null,
    descripcion_problema: f.descripcion_problema,
    observaciones_cliente: f.observaciones_cliente || null,
    diagnostico: f.diagnostico,
    trabajos_realizados: f.trabajos_realizados,
    notas: f.notas,
    presupuesto_aprobado_por_cliente: f.presupuesto_aprobado_por_cliente,
    tiempo_estimado_horas: f.tiempo_estimado_horas,
    tiempo_real_horas: f.tiempo_real_horas,
    fotos_entrada: f.fotos_entrada,
    fotos_salida: f.fotos_salida,
    fotos_diagnostico: f.fotos_diagnostico,
    nivel_combustible: f.nivel_combustible || null,
    renuncia_presupuesto: f.renuncia_presupuesto,
    accion_imprevisto: f.accion_imprevisto || 'avisar',
    recoger_piezas: f.recoger_piezas,
    danos_carroceria: f.danos_carroceria || null,
    coste_diario_estancia: f.coste_diario_estancia || null,
    kilometros_entrada: f.kilometros_entrada || null,
    kilometros_salida: f.kilometros_salida || null,
    fecha_prevista_entrega: f.fecha_prevista_entrega || null,
    iva_porcentaje: f.iva_porcentaje ?? 21,
  }
}
