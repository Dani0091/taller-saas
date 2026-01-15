/**
 * Tipos para el sistema de citas/avisos
 */

export type TipoCita = 'cita' | 'recordatorio' | 'aviso' | 'itv' | 'revision'

export type EstadoCita = 'pendiente' | 'confirmada' | 'completada' | 'cancelada' | 'no_asistio'

export interface Cita {
  id: string
  taller_id: string
  cliente_id?: string | null
  vehiculo_id?: string | null
  orden_id?: string | null

  titulo: string
  descripcion?: string | null
  tipo: TipoCita

  fecha_inicio: string // ISO date
  fecha_fin?: string | null
  todo_el_dia: boolean

  estado: EstadoCita

  recordatorio_email: boolean
  recordatorio_sms: boolean
  minutos_antes_recordatorio: number
  recordatorio_enviado: boolean

  color: string

  notas?: string | null

  created_at: string
  updated_at: string
  created_by?: string | null

  // Relaciones expandidas
  cliente?: {
    id: string
    nombre: string
    apellidos?: string
    telefono?: string
  }
  vehiculo?: {
    id: string
    matricula: string
    marca?: string
    modelo?: string
  }
}

export interface CrearCitaInput {
  cliente_id?: string
  vehiculo_id?: string
  orden_id?: string
  titulo: string
  descripcion?: string
  tipo?: TipoCita
  fecha_inicio: string
  fecha_fin?: string
  todo_el_dia?: boolean
  recordatorio_email?: boolean
  recordatorio_sms?: boolean
  minutos_antes_recordatorio?: number
  color?: string
  notas?: string
}

export interface ActualizarCitaInput extends Partial<CrearCitaInput> {
  estado?: EstadoCita
}

// Colores predefinidos para citas
export const COLORES_CITA = [
  { value: '#3b82f6', label: 'Azul', clase: 'bg-blue-500' },
  { value: '#10b981', label: 'Verde', clase: 'bg-emerald-500' },
  { value: '#f59e0b', label: 'Naranja', clase: 'bg-amber-500' },
  { value: '#ef4444', label: 'Rojo', clase: 'bg-red-500' },
  { value: '#8b5cf6', label: 'Morado', clase: 'bg-violet-500' },
  { value: '#ec4899', label: 'Rosa', clase: 'bg-pink-500' },
  { value: '#6b7280', label: 'Gris', clase: 'bg-gray-500' },
] as const

export const TIPOS_CITA = [
  { value: 'cita', label: '📅 Cita', color: '#3b82f6' },
  { value: 'recordatorio', label: '🔔 Recordatorio', color: '#f59e0b' },
  { value: 'aviso', label: '⚠️ Aviso', color: '#ef4444' },
  { value: 'itv', label: '🚗 ITV', color: '#10b981' },
  { value: 'revision', label: '🔧 Revisión', color: '#8b5cf6' },
] as const

export const ESTADOS_CITA = [
  { value: 'pendiente', label: 'Pendiente', color: 'bg-yellow-500' },
  { value: 'confirmada', label: 'Confirmada', color: 'bg-blue-500' },
  { value: 'completada', label: 'Completada', color: 'bg-green-500' },
  { value: 'cancelada', label: 'Cancelada', color: 'bg-gray-500' },
  { value: 'no_asistio', label: 'No asistió', color: 'bg-red-500' },
] as const
