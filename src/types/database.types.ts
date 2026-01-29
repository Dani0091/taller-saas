/**
 * Database Types for Supabase
 * Generated types for the TallerAgil database schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      talleres: {
        Row: {
          id: string
          nombre: string
          cif: string | null
          direccion: string | null
          telefono: string | null
          email: string | null
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          cif?: string | null
          direccion?: string | null
          telefono?: string | null
          email?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          cif?: string | null
          direccion?: string | null
          telefono?: string | null
          email?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      usuarios: {
        Row: {
          id: string
          email: string
          nombre: string | null
          rol: string
          taller_id: string
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          nombre?: string | null
          rol?: string
          taller_id: string
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          nombre?: string | null
          rol?: string
          taller_id?: string
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      clientes: {
        Row: {
          id: string
          taller_id: string
          nombre: string
          apellidos: string | null
          nif: string
          email: string | null
          telefono: string | null
          direccion: string | null
          ciudad: string | null
          provincia: string | null
          codigo_postal: string | null
          pais: string
          notas: string | null
          estado: string
          tipo_cliente: string | null
          iban: string | null
          forma_pago: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          taller_id: string
          nombre: string
          apellidos?: string | null
          nif: string
          email?: string | null
          telefono?: string | null
          direccion?: string | null
          ciudad?: string | null
          provincia?: string | null
          codigo_postal?: string | null
          pais?: string
          notas?: string | null
          estado?: string
          tipo_cliente?: string | null
          iban?: string | null
          forma_pago?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          taller_id?: string
          nombre?: string
          apellidos?: string | null
          nif?: string
          email?: string | null
          telefono?: string | null
          direccion?: string | null
          ciudad?: string | null
          provincia?: string | null
          codigo_postal?: string | null
          pais?: string
          notas?: string | null
          estado?: string
          tipo_cliente?: string | null
          iban?: string | null
          forma_pago?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      vehiculos: {
        Row: {
          id: string
          taller_id: string
          cliente_id: string | null
          matricula: string
          marca: string | null
          modelo: string | null
          año: number | null
          color: string | null
          kilometros: number | null
          vin: string | null
          bastidor_vin: string | null
          numero_motor: string | null
          tipo_combustible: string | null
          carroceria: string | null
          potencia_cv: number | null
          cilindrada: number | null
          emisiones: string | null
          fecha_matriculacion: string | null
          fotos: any | null
          documentos: any | null
          historial_reparaciones: any | null
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          taller_id: string
          cliente_id?: string | null
          matricula: string
          marca?: string | null
          modelo?: string | null
          año?: number | null
          color?: string | null
          kilometros?: number | null
          vin?: string | null
          bastidor_vin?: string | null
          numero_motor?: string | null
          tipo_combustible?: string | null
          carroceria?: string | null
          potencia_cv?: number | null
          cilindrada?: number | null
          emisiones?: string | null
          fecha_matriculacion?: string | null
          fotos?: any | null
          documentos?: any | null
          historial_reparaciones?: any | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          taller_id?: string
          cliente_id?: string | null
          matricula?: string
          marca?: string | null
          modelo?: string | null
          año?: number | null
          color?: string | null
          kilometros?: number | null
          vin?: string | null
          bastidor_vin?: string | null
          numero_motor?: string | null
          tipo_combustible?: string | null
          carroceria?: string | null
          potencia_cv?: number | null
          cilindrada?: number | null
          emisiones?: string | null
          fecha_matriculacion?: string | null
          fotos?: any | null
          documentos?: any | null
          historial_reparaciones?: any | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ordenes_reparacion: {
        Row: {
          id: string
          taller_id: string
          numero_orden: string
          cliente_id: string | null
          vehiculo_id: string | null
          operario_id: string | null
          estado: string
          descripcion_problema: string | null
          diagnostico: string | null
          trabajos_realizados: string | null
          fecha_entrada: string
          fecha_salida_estimada: string | null
          fecha_salida_real: string | null
          tiempo_estimado_horas: number | null
          tiempo_real_horas: number | null
          subtotal_mano_obra: number | null
          subtotal_piezas: number | null
          iva_amount: number | null
          total_con_iva: number | null
          presupuesto_aprobado_por_cliente: boolean
          notas: string | null
          fotos_entrada: string | null
          fotos_salida: string | null
          nivel_combustible: string | null
          renuncia_presupuesto: boolean | null
          accion_imprevisto: string | null
          recoger_piezas: boolean | null
          danos_carroceria: string | null
          coste_diario_estancia: number | null
          kilometros_entrada: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          taller_id: string
          numero_orden?: string
          cliente_id?: string | null
          vehiculo_id?: string | null
          operario_id?: string | null
          estado?: string
          descripcion_problema?: string | null
          diagnostico?: string | null
          trabajos_realizados?: string | null
          fecha_entrada?: string
          fecha_salida_estimada?: string | null
          fecha_salida_real?: string | null
          tiempo_estimado_horas?: number | null
          tiempo_real_horas?: number | null
          subtotal_mano_obra?: number | null
          subtotal_piezas?: number | null
          iva_amount?: number | null
          total_con_iva?: number | null
          presupuesto_aprobado_por_cliente?: boolean
          notas?: string | null
          fotos_entrada?: string | null
          fotos_salida?: string | null
          nivel_combustible?: string | null
          renuncia_presupuesto?: boolean | null
          accion_imprevisto?: string | null
          recoger_piezas?: boolean | null
          danos_carroceria?: string | null
          coste_diario_estancia?: number | null
          kilometros_entrada?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          taller_id?: string
          numero_orden?: string
          cliente_id?: string | null
          vehiculo_id?: string | null
          operario_id?: string | null
          estado?: string
          descripcion_problema?: string | null
          diagnostico?: string | null
          trabajos_realizados?: string | null
          fecha_entrada?: string
          fecha_salida_estimada?: string | null
          fecha_salida_real?: string | null
          tiempo_estimado_horas?: number | null
          tiempo_real_horas?: number | null
          subtotal_mano_obra?: number | null
          subtotal_piezas?: number | null
          iva_amount?: number | null
          total_con_iva?: number | null
          presupuesto_aprobado_por_cliente?: boolean
          notas?: string | null
          fotos_entrada?: string | null
          fotos_salida?: string | null
          nivel_combustible?: string | null
          renuncia_presupuesto?: boolean | null
          accion_imprevisto?: string | null
          recoger_piezas?: boolean | null
          danos_carroceria?: string | null
          coste_diario_estancia?: number | null
          kilometros_entrada?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      lineas_orden: {
        Row: {
          id: string
          orden_id: string
          tipo: string
          descripcion: string
          cantidad: number
          precio_unitario: number
          descuento_porcentaje: number | null
          iva_porcentaje: number | null
          importe_total: number
          horas: number | null
          operario_id: string | null
          operario_nombre: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          orden_id: string
          tipo?: string
          descripcion: string
          cantidad?: number
          precio_unitario?: number
          descuento_porcentaje?: number | null
          iva_porcentaje?: number | null
          importe_total?: number
          horas?: number | null
          operario_id?: string | null
          operario_nombre?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          orden_id?: string
          tipo?: string
          descripcion?: string
          cantidad?: number
          precio_unitario?: number
          descuento_porcentaje?: number | null
          iva_porcentaje?: number | null
          importe_total?: number
          horas?: number | null
          operario_id?: string | null
          operario_nombre?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      facturas: {
        Row: {
          id: string
          taller_id: string
          cliente_id: string
          numero_factura: string
          numero_serie: string
          fecha_emision: string
          fecha_vencimiento: string | null
          base_imponible: number
          iva: number
          iva_porcentaje: number
          total: number
          estado: string
          metodo_pago: string | null
          notas: string | null
          condiciones_pago: string | null
          verifactu_numero: string | null
          verifactu_url: string | null
          pdf_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          taller_id: string
          cliente_id: string
          numero_factura: string
          numero_serie?: string
          fecha_emision?: string
          fecha_vencimiento?: string | null
          base_imponible?: number
          iva?: number
          iva_porcentaje?: number
          total?: number
          estado?: string
          metodo_pago?: string | null
          notas?: string | null
          condiciones_pago?: string | null
          verifactu_numero?: string | null
          verifactu_url?: string | null
          pdf_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          taller_id?: string
          cliente_id?: string
          numero_factura?: string
          numero_serie?: string
          fecha_emision?: string
          fecha_vencimiento?: string | null
          base_imponible?: number
          iva?: number
          iva_porcentaje?: number
          total?: number
          estado?: string
          metodo_pago?: string | null
          notas?: string | null
          condiciones_pago?: string | null
          verifactu_numero?: string | null
          verifactu_url?: string | null
          pdf_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      lineas_factura: {
        Row: {
          id: string
          factura_id: string
          descripcion: string
          cantidad: number
          precio_unitario: number
          iva_porcentaje: number | null
          importe_total: number
          created_at: string
        }
        Insert: {
          id?: string
          factura_id: string
          descripcion: string
          cantidad?: number
          precio_unitario?: number
          iva_porcentaje?: number | null
          importe_total?: number
          created_at?: string
        }
        Update: {
          id?: string
          factura_id?: string
          descripcion?: string
          cantidad?: number
          precio_unitario?: number
          iva_porcentaje?: number | null
          importe_total?: number
          created_at?: string
        }
      }
      configuracion_taller: {
        Row: {
          id: string
          taller_id: string
          tarifa_hora: number
          incluye_iva: boolean
          porcentaje_iva: number
          tarifa_con_iva: boolean
          nombre_empresa: string | null
          cif: string | null
          direccion: string | null
          telefono: string | null
          email: string | null
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          taller_id: string
          tarifa_hora?: number
          incluye_iva?: boolean
          porcentaje_iva?: number
          tarifa_con_iva?: boolean
          nombre_empresa?: string | null
          cif?: string | null
          direccion?: string | null
          telefono?: string | null
          email?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          taller_id?: string
          tarifa_hora?: number
          incluye_iva?: boolean
          porcentaje_iva?: number
          tarifa_con_iva?: boolean
          nombre_empresa?: string | null
          cif?: string | null
          direccion?: string | null
          telefono?: string | null
          email?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
