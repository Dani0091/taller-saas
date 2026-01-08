export interface Cliente {
  id: string
  taller_id: string
  nombre: string
  apellidos?: string // Campo legacy - mantener por compatibilidad
  primer_apellido?: string
  segundo_apellido?: string
  nif: string
  email?: string
  telefono?: string
  direccion?: string
  ciudad?: string
  provincia?: string
  codigo_postal?: string
  pais?: string
  notas?: string
  estado: 'activo' | 'inactivo' | 'archivado'
  tipo_cliente?: 'personal' | 'empresa'
  iban?: string
  forma_pago?: 'efectivo' | 'transferencia' | 'tarjeta' | 'cheque'
  contacto_principal?: string
  contacto_email?: string
  contacto_telefono?: string
  created_at: string
  updated_at: string
}

export interface ClienteFormData {
  nombre: string
  primer_apellido?: string
  segundo_apellido?: string
  nif: string
  email?: string
  telefono?: string
  direccion?: string
  ciudad?: string
  provincia?: string
  codigo_postal?: string
  pais?: string
  notas?: string
  tipo_cliente?: 'personal' | 'empresa'
  iban?: string
  forma_pago?: 'efectivo' | 'transferencia' | 'tarjeta' | 'cheque'
  contacto_principal?: string
  contacto_email?: string
  contacto_telefono?: string
}

// Helper para obtener nombre completo
export function getNombreCompleto(cliente: Cliente | ClienteFormData): string {
  const partes = [cliente.nombre]
  if ('primer_apellido' in cliente && cliente.primer_apellido) {
    partes.push(cliente.primer_apellido)
  }
  if ('segundo_apellido' in cliente && cliente.segundo_apellido) {
    partes.push(cliente.segundo_apellido)
  }
  // Fallback al campo apellidos legacy
  if (partes.length === 1 && 'apellidos' in cliente && cliente.apellidos) {
    partes.push(cliente.apellidos)
  }
  return partes.join(' ')
}
