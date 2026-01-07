export interface Orden {
  id: string
  numero_orden: string
  taller_id: string
  cliente_id: string | null
  vehiculo_id: string | null
  operario_id: string | null
  estado: 'recibido' | 'diagnostico' | 'presupuestado' | 'aprobado' | 'en_reparacion' | 'completado' | 'entregado' | 'cancelado'
  fecha_entrada: string
  fecha_salida_estimada: string | null
  fecha_salida_real: string | null
  kilometros_entrada: number | null
  kilometros_salida: number | null
  descripcion_problema: string | null
  diagnostico: string | null
  trabajos_realizados: string | null
  presupuesto_aceptado: number | null
  importe_final: number | null
  tiempo_estimado_horas: number | null
  tiempo_real_horas: number | null
  horas_estimadas: number | null
  horas_reales: number | null
  fotos_entrada: string[] | null
  fotos_salida: string[] | null
  notas: string | null
  presupuesto_aprobado_por_cliente: boolean | null
  observaciones_cliente: string | null
  garantia_meses: number | null
  ocr_matricula: string | null
  ocr_cliente_datos: Record<string, any> | null
  foto_ocr_matricula: string | null
  foto_ocr_cliente: string | null
  created_at: string
  updated_at: string
}

export interface OrdenConRelaciones extends Orden {
  clientes?: { nombre: string; telefono?: string; email?: string; direccion?: string }
  vehiculos?: { marca: string; modelo: string; matricula: string; año?: number; color?: string; vin?: string }
  lineas?: LineaOrden[]
}

export interface LineaOrden {
  id: string
  orden_id: string
  tipo: 'mano_obra' | 'pieza' | 'servicio' | 'consumible'
  descripcion: string
  cantidad: number
  precio_unitario: number
  descuento_porcentaje?: number
  iva_porcentaje?: number
  importe_total: number
  horas?: number
  fecha?: string
  operario_id?: string
  operario_nombre?: string
  created_at: string
  updated_at?: string
}

export interface Cliente {
  id: string
  taller_id: string
  nombre: string
  apellidos?: string
  nif?: string
  email?: string
  telefono?: string
  direccion?: string
  notas?: string
  estado?: string
  tipo_cliente?: string
  iban?: string
  contacto_principal?: string
  contacto_email?: string
  contacto_telefono?: string
  created_at: string
  updated_at: string
}

export interface Vehiculo {
  id: string
  taller_id: string
  cliente_id: string
  matricula: string
  marca: string
  modelo: string
  año?: number
  color?: string
  vin?: string
  kilometros?: number
  tipo_combustible?: string
  carroceria?: string
  potencia_cv?: number
  cilindrada?: number
  fotos?: string[]
  notas?: string
}

export interface OCRResult {
  texto: string
  confianza: number
  campo?: string
  fecha_escaneo: string
}
