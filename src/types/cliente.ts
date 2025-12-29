export interface Cliente {
  id: string
  taller_id: string
  nombre: string
  apellidos?: string
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
  apellidos?: string
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
