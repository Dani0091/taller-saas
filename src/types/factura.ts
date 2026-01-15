export interface FacturaItem {
  id: string
  descripcion: string
  cantidad: number
  precioUnitario: number
  impuesto: number
}

export interface Factura {
  id: string
  numero: string
  serie: string
  fecha: Date
  fechaVencimiento: Date
  
  clienteId: string
  clienteNombre: string
  clienteNIF: string
  clienteDireccion: string
  clienteCodigoPostal: string
  clienteCiudad: string
  clienteProvincia: string
  
  tallerNombre: string
  tallerNIF: string
  tallerDireccion: string
  tallerCodigoPostal: string
  tallerCiudad: string
  tallerProvincia: string
  tallerTelefono?: string
  tallerEmail?: string
  tallerWeb?: string
  
  items: FacturaItem[]
  
  baseImponible: number
  totalImpuestos: number
  totalFactura: number
  
  tipo: 'factura' | 'presupuesto'
  estado: 'borrador' | 'emitida' | 'pagada' | 'anulada'
  ordenTrabajoId?: string
  
  notas?: string
  condicionesPago?: string
  
  createdAt: Date
  updatedAt: Date
  createdBy: string
  
  numeroVerifactu?: string
  urlVerifactu?: string
  estado_verifactu?: 'pendiente' | 'aceptada' | 'rechazada'
  
  firmado: boolean
}

export interface ConfiguracionFactura {
  tallerNombre: string
  tallerNIF: string
  tallerDireccion: string
  tallerCodigoPostal: string
  tallerCiudad: string
  tallerProvincia: string
  tallerTelefono?: string
  tallerEmail?: string
  tallerWeb?: string
  
  serieFacturas: string
  seriePresupuestos: string
  numeroProximoFactura: number
  numeroProximoPresupuesto: number
  
  porcentajeIVA: number
  retencionesProfesionales: boolean
  porcentajeRetenciones?: number
  
  condicionesPago: string
  notasFactura: string
  
  logo?: string
}

export interface FacturaFilters {
  estado?: Factura['estado']
  tipo?: Factura['tipo']
  clienteId?: string
  fechaDesde?: Date
  fechaHasta?: Date
  busqueda?: string
}
