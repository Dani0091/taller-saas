/**
 * Tipos de la base de datos Supabase
 *
 * TODO: Generar tipos automáticamente con:
 * npx supabase gen types typescript --project-id=YOUR_PROJECT_ID > src/types/database.types.ts
 *
 * Por ahora usamos un placeholder para evitar errores de compilación.
 */

export type Database = {
  public: {
    Tables: {
      clientes: {
        Row: {
          id: string
          taller_id: string
          nombre: string
          apellidos: string | null
          nif: string | null
          email: string | null
          telefono: string | null
          direccion: string | null
          notas: string | null
          estado: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['clientes']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['clientes']['Insert']>
      }
      ordenes_reparacion: {
        Row: {
          id: string
          taller_id: string
          numero_orden: string
          cliente_id: string | null
          vehiculo_id: string | null
          estado: string
          descripcion_problema: string | null
          kilometros_entrada: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['ordenes_reparacion']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['ordenes_reparacion']['Insert']>
      }
      vehiculos: {
        Row: {
          id: string
          taller_id: string
          cliente_id: string | null
          marca: string | null
          modelo: string | null
          matricula: string | null
          ano: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['vehiculos']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['vehiculos']['Insert']>
      }
      facturas: {
        Row: {
          id: string
          taller_id: string
          orden_id: string | null
          cliente_id: string | null
          numero_factura: string
          total: number
          estado: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['facturas']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['facturas']['Insert']>
      }
      usuarios: {
        Row: {
          id: string
          email: string
          taller_id: string
          rol: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['usuarios']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['usuarios']['Insert']>
      }
      talleres: {
        Row: {
          id: string
          nombre: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['talleres']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['talleres']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
